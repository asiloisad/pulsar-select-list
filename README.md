# pulsar-select-list

This module is an [etch component](https://github.com/atom/etch) that can be used in Pulsar packages to show a select list with fuzzy filtering, keyboard/mouse navigation and other cool features.

## Installation

```json
"dependencies": {
  "pulsar-select-list": "github:asiloisad/pulsar-select-list"
}
```

## Usage

After installing the module, you can simply require it and use it as a standalone component:

```js
const SelectListView = require('pulsar-select-list')

const usersSelectList = new SelectListView({
  items: ['Alice', 'Bob', 'Carol'],
  elementForItem: (item) => {
    const li = document.createElement('li')
    li.textContent = item
    return li
  },
  didConfirmSelection: (item) => {
    console.log('Selected:', item)
  }
})

// Show as modal panel
usersSelectList.show()
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

* `items: [Object]`: an array containing the objects you want to show in the select list.
* `elementForItem: (item: Object, options: Object) -> HTMLElement`: a function that is called whenever an item needs to be displayed.
  * `options: Object`:
    * `selected: Boolean`: indicating whether item is selected or not.
    * `index: Number`: item's index.
    * `visible: Boolean`: indicating whether item is visible in viewport or not.

#### Optional

* `className: String`: CSS class name(s) to add to the select list element. Multiple classes can be space-separated.
* `maxResults: Number`: the number of maximum items that are shown.
* `filter: (items: [Object], query: String) -> [Object]`: a function that allows to decide which items to show whenever the query changes. By default, it uses Pulsar's built-in fuzzy matcher.
* `filterKeyForItem: (item: Object) -> String`: when `filter` is not provided, this function will be called to retrieve a string property on each item and that will be used to filter them.
* `filterQuery: (query: String) -> String`: a function that allows to apply a transformation to the user query and whose return value will be used to filter items.
* `replaceDiacritics: Boolean`: when `true` (default), removes diacritical marks from both the query and item text before filtering, enabling accent-insensitive matching (e.g., "cafe" matches "café"). Set to `false` to disable.
* `filterScoreModifier: (score: Number, item: Object) -> Number`: a function to modify the fuzzy match score for each item. Useful for applying custom ranking factors (e.g., boosting by recency or proximity).
* `filterThreshold: Number`: minimum score required for an item to be included in results; defaults to `0`. Scores at or below this threshold are filtered out.
* `query: String`: a string that will replace the contents of the query editor.
* `selectQuery: Boolean`: a boolean indicating whether the query text should be selected or not.
* `order: (item1: Object, item2: Object) -> Number`: a function that allows to change the order in which items are shown.
* `emptyMessage: String`: a string shown when the list is empty.
* `errorMessage: String`: a string that needs to be set when you want to notify the user that an error occurred.
* `infoMessage: String`: a string that needs to be set when you want to provide some information to the user.
* `helpMessage: String|Array`: content to display when help is toggled. Use `toggleHelp()` to show/hide. Can be a string or JSX array for rich formatting.
* `helpMarkdown: String`: markdown content to display when help is toggled. Rendered using Pulsar's built-in markdown renderer. Preferred over `helpMessage` for simple help text stored in `.md` files.
* `loadingMessage: String`: a string that needs to be set when you are loading items in the background.
* `loadingBadge: String/Number`: a string or number that needs to be set when the progress status changes.
* `itemsClassList: [String]`: an array of strings that will be added as class names to the items element.
* `initialSelectionIndex: Number`: the index of the item to initially select; defaults to `0`.
* `initiallyVisibleItemCount: Number`: When provided, `SelectListView` observes visibility of items in viewport, visibility state is passed as `visible` option to `elementForItem`.
* `placeholderText: String`: placeholder text to display in the query editor when empty.
* `skipCommandsRegistration: Boolean`: when `true`, skips registering default keyboard commands.

### Registered Commands

By default, the component registers these commands on its element:

* `core:move-up` / `core:move-down`: Navigate items
* `core:move-to-top` / `core:move-to-bottom`: Jump to first/last item
* `core:confirm`: Confirm selection
* `core:cancel`: Cancel selection
* `select-list:help`: Toggle help message visibility (requires `helpMessage` or `helpMarkdown`)

#### Callbacks

* `didChangeQuery: (query: String) -> Void`: called when the query changes.
* `didChangeSelection: (item: Object) -> Void`: called when the selected item changes.
* `didConfirmSelection: (item: Object) -> Void`: called when the user clicks or presses Enter on an item.
* `didConfirmEmptySelection: () -> Void`: called when the user presses Enter but the list is empty.
* `didCancelSelection: () -> Void`: called when the user presses Esc or the list loses focus.
* `willShow: () -> Void`: called when transitioning from hidden to visible, useful for data preparation.

### Instance Properties

* `processedQuery: String`: The cached result of `getFilterQuery()`, updated after each query change. Useful in `elementForItem` to avoid calling `getFilterQuery()` multiple times.
* `refs.queryEditor`: The underlying TextEditor component for the query input.

### Instance Methods

#### Panel Management

* `show()`: Shows the select list as a modal panel and focuses the query editor. Calls `willShow` callback if provided.
* `hide()`: Hides the panel and restores focus to the previously focused element.
* `toggle()`: Toggles the visibility of the panel.
* `isVisible()`: Returns `true` if the panel is currently visible.
* `isHelpMode()`: Returns `true` if help is currently displayed.
* `toggleHelp()`: Toggles help message visibility. Only works if `helpMessage` is set.
* `hideHelp()`: Hides help message if currently shown.

#### Other Methods

* `focus()`: Focuses the query editor.
* `reset()`: Clears the query editor text.
* `destroy()`: Disposes of the component and cleans up resources.
* `update(props)`: Updates the component with new props.
* `getQuery()`: Returns the current query string.
* `getFilterQuery()`: Returns the filtered query string (applies `filterQuery` transformation).
* `setQueryFromSelection()`: Sets the query text from the active editor's selection. Returns `true` if successful, `false` if no editor, no selection, or selection contains newlines.
* `getSelectedItem()`: Returns the currently selected item.
* `selectPrevious()`: Selects the previous item.
* `selectNext()`: Selects the next item.
* `selectFirst()`: Selects the first item.
* `selectLast()`: Selects the last item.
* `selectNone()`: Deselects all items.
* `selectIndex(index)`: Selects the item at the given index.
* `selectItem(item)`: Selects the given item.
* `confirmSelection()`: Confirms the current selection.
* `cancelSelection()`: Cancels the selection.

### Static Methods

#### `SelectListView.highlightMatches(text, matchIndices, options)`

Creates a DocumentFragment with highlighted match characters.

```js
const matches = atom.ui.fuzzyMatcher.match(query, text, {
  recordMatchIndexes: true
}).matchIndexes

const fragment = SelectListView.highlightMatches(text, matches)
element.appendChild(fragment)

// With custom class name
const fragment = SelectListView.highlightMatches(text, matches, {
  className: 'my-highlight'
})
```

* `text: String`: the text to highlight.
* `matchIndices: [Number]`: array of character indices to highlight.
* `options: Object` (optional):
  * `className: String`: CSS class for highlighted spans; defaults to `'character-match'`.

Returns a `DocumentFragment` containing text nodes and `<span>` elements with the specified class.

#### `SelectListView.replaceDiacritics(str)`

Removes diacritical marks (accents) from a string.

```js
SelectListView.replaceDiacritics('café') // => 'cafe'
SelectListView.replaceDiacritics('naïve') // => 'naive'
SelectListView.replaceDiacritics('Müller') // => 'Muller'
```

* `str: String`: the string to process.

Returns the string with diacritical marks removed. Uses `String.normalize('NFD')` internally.

#### `SelectListView.createTwoLineItem(options)`

Creates a two-line list item element with primary and optional secondary lines. This is a convenience helper for the common Atom/Pulsar two-line item pattern.

```js
const li = SelectListView.createTwoLineItem({
  primary: SelectListView.highlightMatches(item.name, matches),
  secondary: item.description,
  icon: ['icon-file-text'],
  data: { path: item.path },
  classes: ['my-item']
})
```

* `options: Object`:
  * `primary: String|Node`: Primary line content (text string or DOM node)
  * `secondary: String|Node` (optional): Secondary line content
  * `icon: [String]` (optional): Icon class names to add to primary line (adds `icon` class automatically)
  * `data: Object` (optional): Data attributes to set on primary line (e.g., `{path: '/foo'}` becomes `data-path="/foo"`)
  * `classes: [String]` (optional): Additional CSS classes for the `<li>` element

Returns an `HTMLLIElement` with the structure:
```html
<li class="two-lines [classes]">
  <div class="primary-line icon [icon]" data-[key]="[value]">[primary]</div>
  <div class="secondary-line">[secondary]</div>
</li>
```

#### `SelectListView.setScheduler(scheduler)`

Sets the etch scheduler.

#### `SelectListView.getScheduler()`

Gets the current etch scheduler.

## Example

```js
const SelectListView = require('pulsar-select-list')
const fs = require('fs')
const path = require('path')

class MyFileList {
  constructor() {
    this.selectList = new SelectListView({
      className: 'my-package my-file-list',
      items: [],
      filterKeyForItem: (item) => item.name,
      emptyMessage: 'No files found',
      helpMarkdown: fs.readFileSync(path.join(__dirname, 'help.md'), 'utf8'),

      willShow: () => {
        this.previouslyFocusedElement = document.activeElement
        this.loadFiles()
      },

      elementForItem: (item, options) => {
        const li = document.createElement('li')
        if (!options.visible) {
          return li
        }

        const query = this.selectList.processedQuery || ''
        const matches = query
          ? atom.ui.fuzzyMatcher.match(item.name, query, {
              recordMatchIndexes: true
            }).matchIndexes
          : []

        li.appendChild(SelectListView.highlightMatches(item.name, matches))

        li.addEventListener('contextmenu', () => {
          this.selectList.selectIndex(options.index)
        })

        return li
      },

      didConfirmSelection: (item) => {
        atom.workspace.open(item.path)
        this.selectList.hide()
      },

      didCancelSelection: () => {
        this.selectList.hide()
      },
    })
  }

  loadFiles() {
    // Load files and update items
    this.selectList.update({ items: this.files })
  }

  toggle() {
    this.selectList.toggle()
  }

  destroy() {
    this.selectList.destroy()
  }
}
```

### Advanced: Custom Score Modifier

Use `filterScoreModifier` and `filterThreshold` to customize ranking:

```js
const selectList = new SelectListView({
  items: files,
  elementForItem: (item) => {
    const li = document.createElement('li')
    li.textContent = item.path
    return li
  },
  filterKeyForItem: (item) => item.path,
  // Boost score by proximity (items closer to current file rank higher)
  filterScoreModifier: (score, item) => score / item.distance,
  // Only show items with meaningful scores
  filterThreshold: 0.01,
  didConfirmSelection: (item) => {
    atom.workspace.open(item.path)
  }
})
```

## Migration from atom-select-list

If you're migrating from `atom-select-list`, here are the key changes:

### Package.json

```diff
"dependencies": {
-  "atom-select-list": "^0.8.1",
+  "pulsar-select-list": "github:asiloisad/pulsar-select-list"
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

this.slv = new SelectListView({
+  className: 'my-list',
   items: [],
+  willShow: () => this.onWillShow(),
   // ...
})
-this.slv.element.classList.add('my-list')

-showView() {
-  this.previouslyFocusedElement = document.activeElement
-  if (!this.panel) {
-    this.panel = atom.workspace.addModalPanel({ item: this.slv })
-  }
-  this.panel.show()
-  this.slv.focus()
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
+this.slv.toggle()

-this.hideView()
+this.slv.hide()
```

### Diacritics

Replace external diacritics library with built-in static method:

```diff
-const Diacritics = require('diacritic')

-Diacritics.clean(text)
+SelectListView.replaceDiacritics(text)
```

### Query Access

Use `processedQuery` instead of storing query in filter:

```diff
filter(items, query) {
-  this.query = query
+  // query is passed to filter, use this.slv.processedQuery in elementForItem
}

elementForItem(item, options) {
-  const query = this.query
+  const query = this.slv.processedQuery || ''
}
```

### Highlighting

Use built-in `highlightMatches` static method:

```diff
-this.highlightInElement(el, text, indices)
+el.appendChild(SelectListView.highlightMatches(text, indices))
```


### Help Message

Replace `infoMessage` with `helpMarkdown` and the built-in `select-list:help` command:

```diff
this.slv = new SelectListView({
-  // No help by default
+  helpMarkdown: fs.readFileSync(path.join(__dirname, 'help.md'), 'utf8'),
})

-atom.config.observe('my-package.showKeystrokes', (value) => {
-  this.slv.update({ infoMessage: value ? [...] : null })
-})
```

Create a `help.md` file with your help content:

```markdown
- **Enter** — Confirm selection
- **Alt+Enter** — Alternative action
- **F12** — Toggle this help
```

Add F12 keybinding to toggle help (keymaps/my-package.cson):

```cson
'.my-list atom-text-editor[mini]':
  'f12': 'select-list:help'
```

The `select-list:help` command is registered automatically by the component.
