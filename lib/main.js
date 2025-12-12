'use strict'

const { Disposable, CompositeDisposable, TextEditor } = require('atom')
const etch = require('etch')
const $ = etch.dom

class SelectListView {
  static setScheduler(scheduler) {
    etch.setScheduler(scheduler)
  }

  static getScheduler() {
    return etch.getScheduler()
  }

  static replaceDiacritics(str) {
    if (!str) return ''
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  static highlightMatches(text, matchIndices, options = {}) {
    const { className = 'character-match' } = options
    const fragment = document.createDocumentFragment()

    if (!matchIndices || matchIndices.length === 0) {
      fragment.appendChild(document.createTextNode(text))
      return fragment
    }

    // Filter out invalid indices (negative or out of range)
    const validIndices = matchIndices.filter((i) => i >= 0 && i < text.length)

    if (validIndices.length === 0) {
      fragment.appendChild(document.createTextNode(text))
      return fragment
    }

    let lastIndex = 0
    let matchChars = ''

    for (const index of validIndices) {
      if (index > lastIndex) {
        if (matchChars) {
          const span = document.createElement('span')
          span.className = className
          span.textContent = matchChars
          fragment.appendChild(span)
          matchChars = ''
        }
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)))
      }
      matchChars += text[index]
      lastIndex = index + 1
    }

    if (matchChars) {
      const span = document.createElement('span')
      span.className = className
      span.textContent = matchChars
      fragment.appendChild(span)
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
    }

    return fragment
  }

  /**
   * Creates a two-line list item element with primary and optional secondary lines.
   * @param {Object} options - Configuration options
   * @param {string|Node} options.primary - Primary line content (text or DOM node)
   * @param {string|Node} [options.secondary] - Secondary line content (optional)
   * @param {string[]} [options.icon] - Icon class names to add to primary line
   * @returns {HTMLLIElement} The created list item element
   */
  static createTwoLineItem({ primary, secondary, icon }) {
    const li = document.createElement('li')
    li.classList.add('two-lines')

    const priLine = document.createElement('div')
    priLine.classList.add('primary-line')
    if (icon && icon.length > 0) {
      priLine.classList.add('icon', ...icon)
    }
    if (typeof primary === 'string') {
      priLine.textContent = primary
    } else if (primary) {
      priLine.appendChild(primary)
    }
    li.appendChild(priLine)

    if (secondary !== undefined && secondary !== null) {
      const secLine = document.createElement('div')
      secLine.classList.add('secondary-line')
      if (typeof secondary === 'string') {
        secLine.textContent = secondary
      } else {
        secLine.appendChild(secondary)
      }
      li.appendChild(secLine)
    }

    return li
  }

  constructor(props) {
    this.props = props
    if (!this.props.hasOwnProperty('initialSelectionIndex')) {
      this.props.initialSelectionIndex = 0
    }
    if (props.initiallyVisibleItemCount) {
      this.initializeVisibilityObserver()
    }
    this.computeItems(false)
    this.showHelp = false
    this.helpMarkdownHtml = null
    this.renderHelpMarkdownOnce()
    this.disposables = new CompositeDisposable()
    etch.initialize(this)
    this.element.classList.add('select-list')
    if (props.className) {
      this.element.classList.add(...props.className.split(/\s+/).filter(Boolean))
    }
    this.disposables.add(this.refs.queryEditor.onDidChange(this.didChangeQuery.bind(this)))
    if (props.placeholderText) {
      this.refs.queryEditor.setPlaceholderText(props.placeholderText)
    }
    if (!props.skipCommandsRegistration) {
      this.disposables.add(this.registerAtomCommands())
    }
    const editorElement = this.refs.queryEditor.element
    const didLoseFocus = this.didLoseFocus.bind(this)
    editorElement.addEventListener('blur', didLoseFocus)

    this.didClickInside = false
    this.didMouseDown = () => {
      this.didClickInside = true
    }
    this.element.addEventListener('mousedown', this.didMouseDown)
    this.disposables.add(new Disposable(() => {
      editorElement.removeEventListener('blur', didLoseFocus)
      this.element.removeEventListener('mousedown', this.didMouseDown)
    }))
  }

  initializeVisibilityObserver() {
    this.visibilityObserver = new IntersectionObserver(changes => {
      for (const change of changes) {
        if (change.intersectionRatio > 0) {
          const element = change.target
          this.visibilityObserver.unobserve(element)
          const index = Array.from(this.refs.items.children).indexOf(element)
          if (index >= 0) {
            this.renderItemAtIndex(index)
          }
        }
      }
    })
  }

  focus() {
    this.refs.queryEditor.element.focus()
  }

  didLoseFocus(event) {
    if (this.didClickInside || this.element.contains(event.relatedTarget)) {
      this.didClickInside = false
      this.refs.queryEditor.element.focus()
    } else if (document.hasFocus() && this.isVisible()) {
      this.cancelSelection()
    }
  }

  reset() {
    this.refs.queryEditor.setText('')
  }

  destroy() {
    this.disposables.dispose()
    if (this.visibilityObserver) this.visibilityObserver.disconnect()
    if (this.panel) {
      this.panel.destroy()
      this.panel = null
    }
    return etch.destroy(this)
  }

  show() {
    if (this.isVisible()) { return }

    // Call willShow callback only when transitioning from hidden to visible
    if (this.props.willShow) {
      this.props.willShow()
    }

    // Store previously focused element, but skip other select-list inputs
    const active = document.activeElement
    if (active && !active.closest('.select-list')) {
      this.previouslyFocusedElement = active
    }

    this.refs.queryEditor.selectAll()

    if (!this.panel) {
      this.panel = atom.workspace.addModalPanel({ item: this, visible: false })
    }

    this.panel.show()
    this.focus()
  }

  hide() {
    if (!this.isVisible()) { return }

    if (this.panel) {
      this.panel.hide()
    }

    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
      this.previouslyFocusedElement = null
    }
  }

  toggle() {
    if (this.isVisible()) {
      this.hide()
    } else {
      this.show()
    }
  }

  isVisible() {
    return this.panel && this.panel.isVisible()
  }

  registerAtomCommands() {
    return atom.commands.add(this.element, {
      'core:move-up': (event) => {
        if (this.isHelpMode()) return
        this.selectPrevious()
        event.stopPropagation()
      },
      'core:move-down': (event) => {
        if (this.isHelpMode()) return
        this.selectNext()
        event.stopPropagation()
      },
      'core:move-to-top': (event) => {
        if (this.isHelpMode()) return
        this.selectFirst()
        event.stopPropagation()
      },
      'core:move-to-bottom': (event) => {
        if (this.isHelpMode()) return
        this.selectLast()
        event.stopPropagation()
      },
      'core:confirm': (event) => {
        this.confirmSelection()
        event.stopPropagation()
      },
      'core:cancel': (event) => {
        this.cancelSelection()
        event.stopPropagation()
      },
      'select-list:help': (event) => {
        this.toggleHelp()
        event.stopPropagation()
      }
    })
  }

  update(props = {}) {
    let shouldComputeItems = false

    if ('items' in props) {
      this.props.items = props.items
      shouldComputeItems = true
    }

    if ('maxResults' in props) {
      this.props.maxResults = props.maxResults
      shouldComputeItems = true
    }

    if ('filter' in props) {
      this.props.filter = props.filter
      shouldComputeItems = true
    }

    if ('filterQuery' in props) {
      this.props.filterQuery = props.filterQuery
      shouldComputeItems = true
    }

    if ('replaceDiacritics' in props) {
      this.props.replaceDiacritics = props.replaceDiacritics
      shouldComputeItems = true
    }

    if ('filterKeyForItem' in props) {
      this.props.filterKeyForItem = props.filterKeyForItem
      shouldComputeItems = true
    }

    if ('filterScoreModifier' in props) {
      this.props.filterScoreModifier = props.filterScoreModifier
      shouldComputeItems = true
    }

    if ('filterThreshold' in props) {
      this.props.filterThreshold = props.filterThreshold
      shouldComputeItems = true
    }

    if ('query' in props) {
      this.refs.queryEditor.setText(props.query)
      shouldComputeItems = false
    }

    if ('selectQuery' in props) {
      if (props.selectQuery) {
        this.refs.queryEditor.selectAll()
      } else {
        this.refs.queryEditor.clearSelections()
      }
    }

    if ('order' in props) {
      this.props.order = props.order
    }

    if ('emptyMessage' in props) {
      this.props.emptyMessage = props.emptyMessage
    }

    if ('errorMessage' in props) {
      this.props.errorMessage = props.errorMessage
    }

    if ('infoMessage' in props) {
      this.props.infoMessage = props.infoMessage
    }

    if ('helpMessage' in props) {
      this.props.helpMessage = props.helpMessage
    }

    if ('helpMarkdown' in props) {
      this.props.helpMarkdown = props.helpMarkdown
      this.helpMarkdownHtml = null
      this.renderHelpMarkdownOnce()
    }

    if ('loadingMessage' in props) {
      this.props.loadingMessage = props.loadingMessage
    }

    if ('loadingBadge' in props) {
      this.props.loadingBadge = props.loadingBadge
    }

    if ('itemsClassList' in props) {
      this.props.itemsClassList = props.itemsClassList
    }

    if ('initialSelectionIndex' in props) {
      this.props.initialSelectionIndex = props.initialSelectionIndex
    }

    if ('placeholderText' in props) {
      this.props.placeholderText = props.placeholderText
      this.refs.queryEditor.setPlaceholderText(props.placeholderText || '')
    }

    if (shouldComputeItems) {
      this.computeItems()
    }

    return etch.update(this)
  }

  render() {
    return $.div(
      {},
      this.renderQueryRow(),
      this.renderLoadingMessage(),
      this.renderInfoMessage(),
      this.renderErrorMessage(),
      this.renderHelpMessage(),
      this.renderItems()
    )
  }

  renderQueryRow() {
    if (this.props.helpMessage || this.props.helpMarkdown) {
      return $.div(
        {className: 'select-list-query-row'},
        $(TextEditor, {ref: 'queryEditor', mini: true}),
        $.span({
          className: 'select-list-help-toggle icon-question',
          on: {click: () => this.toggleHelp()}
        })
      )
    }
    return $(TextEditor, {ref: 'queryEditor', mini: true})
  }

  renderItems() {
    if (this.isHelpMode()) {
      return ''
    }
    if (this.items.length > 0) {
      const className = ['list-group'].concat(this.props.itemsClassList || []).join(' ')

      if (this.visibilityObserver) {
        etch.getScheduler().updateDocument(() => {
          Array.from(this.refs.items.children).slice(this.props.initiallyVisibleItemCount).forEach((element) => {
            this.visibilityObserver.observe(element)
          })
        })
      }

      this.listItems = this.items.map((item, index) => {
        const selected = this.getSelectedItem() === item
        const visible = !this.props.initiallyVisibleItemCount || index < this.props.initiallyVisibleItemCount
        return $(ListItemView, {
          element: this.props.elementForItem(item, {selected, index, visible}),
          selected: selected,
          onclick: () => this.didClickItem(index),
          oncontextmenu: () => this.selectIndex(index)
        })
      })

      return $.ol(
        {className, ref: 'items'},
        ...this.listItems
      )
    } else if (!this.props.loadingMessage && !this.isHelpMode() && this.props.emptyMessage) {
      return $.div({ref: 'emptyMessage', className: 'empty-message'}, this.props.emptyMessage)
    } else {
      return ""
    }
  }

  renderErrorMessage() {
    if (this.props.errorMessage) {
      return $.div({ref: 'errorMessage', className: 'error-message'}, this.props.errorMessage)
    } else {
      return ''
    }
  }

  renderInfoMessage() {
    if (this.props.infoMessage) {
      return $.div({ref: 'infoMessage', className: 'info-message'}, this.props.infoMessage)
    } else {
      return ''
    }
  }

  renderLoadingMessage() {
    if (this.props.loadingMessage) {
      return $.div(
        {className: 'loading'},
        $.div({ref: 'loadingMessage', className: 'loading-message'}, this.props.loadingMessage),
        $.span({className: 'loading loading-spinner-tiny inline-block'}),
        this.props.loadingBadge ? $.span({ref: 'loadingBadge', className: 'badge'}, this.props.loadingBadge) : ''
      )
    } else {
      return ''
    }
  }

  renderHelpMessage() {
    if (!this.showHelp) {
      return ''
    }
    if (this.props.helpMarkdown) {
      return $.div({ref: 'helpMarkdownContainer', className: 'help-message'})
    }
    if (this.props.helpMessage) {
      return $.div({ref: 'helpMessage', className: 'help-message'}, this.props.helpMessage)
    }
    return ''
  }

  renderHelpMarkdownOnce() {
    if (this.props.helpMarkdown && !this.helpMarkdownHtml) {
      if (atom.ui && atom.ui.markdown && atom.ui.markdown.render) {
        this.helpMarkdownHtml = atom.ui.markdown.render(this.props.helpMarkdown)
      } else {
        // Fallback: escape and wrap as text
        const escaped = this.props.helpMarkdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        this.helpMarkdownHtml = `<p>${escaped}</p>`
      }
    }
  }

  updateHelpMarkdown() {
    const container = this.element.querySelector('.help-message')
    if (container && this.helpMarkdownHtml) {
      container.innerHTML = this.helpMarkdownHtml
    }
  }

  isHelpMode() {
    return (this.props.helpMessage || this.props.helpMarkdown) && this.showHelp
  }

  toggleHelp() {
    if (!this.props.helpMessage && !this.props.helpMarkdown) return
    this.showHelp = !this.showHelp
    return etch.update(this).then(() => {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        this.updateHelpMarkdown()
      })
    })
  }

  hideHelp() {
    if (this.showHelp) {
      this.showHelp = false
      return etch.update(this)
    }
    return Promise.resolve()
  }

  getQuery() {
    if (this.refs && this.refs.queryEditor) {
      return this.refs.queryEditor.getText()
    } else {
      return ''
    }
  }

  getFilterQuery() {
    return this.props.filterQuery ? this.props.filterQuery(this.getQuery()) : this.getQuery()
  }

  setQueryFromSelection() {
    const editor = atom.workspace.getActiveTextEditor()
    if (!editor) return false
    const text = editor.getSelectedText()
    if (!text || /\n/.test(text)) return false
    this.refs.queryEditor.setText(text)
    this.refs.queryEditor.selectAll()
    return true
  }

  didChangeQuery() {
    if (this.props.didChangeQuery) {
      this.props.didChangeQuery(this.getFilterQuery())
    }

    this.hideHelp()
    this.computeItems()
  }

  didClickItem(itemIndex) {
    this.selectIndex(itemIndex)
    this.confirmSelection()
  }

  computeItems(updateComponent) {
    this.listItems = null
    this.matchIndicesMap = new Map()
    if (this.visibilityObserver) this.visibilityObserver.disconnect()
    const filterFn = this.props.filter || this.fuzzyFilter.bind(this)
    this.processedQuery = this.getFilterQuery()
    this.items = filterFn(this.props.items.slice(), this.processedQuery)
    if (this.props.order) {
      this.items.sort(this.props.order)
    }
    if (this.props.maxResults) {
      this.items = this.items.slice(0, this.props.maxResults)
    }

    this.selectIndex(this.props.initialSelectionIndex, updateComponent)
  }

  fuzzyFilter(items, query) {
    if (query.length === 0) {
      return items
    }

    const replaceDiacritics = this.props.replaceDiacritics ?? true
    if (replaceDiacritics) {
      query = SelectListView.replaceDiacritics(query)
    }

    const threshold = this.props.filterThreshold ?? 0
    const modifyScore = this.props.filterScoreModifier
    const scoredItems = []

    for (const item of items) {
      let string = this.props.filterKeyForItem ? this.props.filterKeyForItem(item) : item
      if (replaceDiacritics) {
        string = SelectListView.replaceDiacritics(string)
      }
      const result = atom.ui.fuzzyMatcher.match(string, query, { recordMatchIndexes: true })
      if (!result) continue
      let score = result.score
      if (modifyScore) {
        score = modifyScore(score, item)
      }
      if (score > threshold) {
        scoredItems.push({item, score, matchIndexes: result.matchIndexes})
      }
    }

    scoredItems.sort((a, b) => b.score - a.score)
    for (const {item, matchIndexes} of scoredItems) {
      this.matchIndicesMap.set(item, matchIndexes)
    }
    return scoredItems.map((i) => i.item)
  }

  getMatchIndices(item) {
    return this.matchIndicesMap ? this.matchIndicesMap.get(item) : null
  }

  getSelectedItem() {
    if (this.selectionIndex === undefined) return null
    return this.items[this.selectionIndex]
  }

  renderItemAtIndex(index) {
    const item = this.items[index]
    const selected = this.getSelectedItem() === item
    const component = this.listItems[index].component
    if (this.visibilityObserver) this.visibilityObserver.unobserve(component.element)
    component.update({
      element: this.props.elementForItem(item, {selected, index, visible: true}),
      selected: selected,
      onclick: () => this.didClickItem(index),
      oncontextmenu: () => this.selectIndex(index)
    })
  }

  selectPrevious() {
    if (this.selectionIndex === undefined) return this.selectLast()
    return this.selectIndex(this.selectionIndex - 1)
  }

  selectNext() {
    if (this.selectionIndex === undefined) return this.selectFirst()
    return this.selectIndex(this.selectionIndex + 1)
  }

  selectFirst() {
    return this.selectIndex(0)
  }

  selectLast() {
    return this.selectIndex(this.items.length - 1)
  }

  selectNone() {
    return this.selectIndex(undefined)
  }

  selectIndex(index, updateComponent = true) {
    if (index >= this.items.length) {
      index = 0
    } else if (index < 0) {
      index = this.items.length - 1
    }

    const oldIndex = this.selectionIndex

    this.selectionIndex = index
    if (index !== undefined && this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }

    if (updateComponent) {
      if (this.listItems) {
        if (oldIndex >= 0) this.renderItemAtIndex(oldIndex)
        if (index >= 0) this.renderItemAtIndex(index)
        return etch.getScheduler().getNextUpdatePromise()
      } else {
        return etch.update(this)
      }
    } else {
      return Promise.resolve()
    }
  }

  selectItem(item) {
    const index = this.items.indexOf(item)
    if (index === -1) {
      throw new Error('Cannot select the specified item because it does not exist.')
    } else {
      return this.selectIndex(index)
    }
  }

  confirmSelection() {
    const selectedItem = this.getSelectedItem()
    if (selectedItem != null) {
      if (this.props.didConfirmSelection) {
        this.props.didConfirmSelection(selectedItem)
      }
    } else {
      if (this.props.didConfirmEmptySelection) {
        this.props.didConfirmEmptySelection()
      }
    }
  }

  cancelSelection() {
    if (this.props.didCancelSelection) {
      this.props.didCancelSelection()
    }
  }
}

class ListItemView {
  constructor(props) {
    this.mouseDown = this.mouseDown.bind(this)
    this.mouseUp = this.mouseUp.bind(this)
    this.didClick = this.didClick.bind(this)
    this.didContextMenu = this.didContextMenu.bind(this)
    this.selected = props.selected
    this.onclick = props.onclick
    this.oncontextmenu = props.oncontextmenu
    this.element = props.element
    this.element.addEventListener('mousedown', this.mouseDown)
    this.element.addEventListener('mouseup', this.mouseUp)
    this.element.addEventListener('click', this.didClick)
    this.element.addEventListener('contextmenu', this.didContextMenu)
    if (this.selected) {
      this.element.classList.add('selected')
    }
    this.domEventsDisposable = new Disposable(() => {
      this.element.removeEventListener('mousedown', this.mouseDown)
      this.element.removeEventListener('mouseup', this.mouseUp)
      this.element.removeEventListener('click', this.didClick)
      this.element.removeEventListener('contextmenu', this.didContextMenu)
    })
    etch.getScheduler().updateDocument(this.scrollIntoViewIfNeeded.bind(this))
  }

  mouseDown(event) {
    event.preventDefault()
  }

  mouseUp(event) {
    event.preventDefault()
  }

  didClick(event) {
    event.preventDefault()
    this.onclick()
  }

  didContextMenu() {
    this.oncontextmenu()
  }

  destroy() {
    this.element.remove()
    this.domEventsDisposable.dispose()
  }

  update(props) {
    this.element.removeEventListener('mousedown', this.mouseDown)
    this.element.removeEventListener('mouseup', this.mouseUp)
    this.element.removeEventListener('click', this.didClick)
    this.element.removeEventListener('contextmenu', this.didContextMenu)

    this.element.parentNode.replaceChild(props.element, this.element)
    this.element = props.element
    this.element.addEventListener('mousedown', this.mouseDown)
    this.element.addEventListener('mouseup', this.mouseUp)
    this.element.addEventListener('click', this.didClick)
    this.element.addEventListener('contextmenu', this.didContextMenu)
    if (props.selected) {
      this.element.classList.add('selected')
    }

    this.selected = props.selected
    this.onclick = props.onclick
    this.oncontextmenu = props.oncontextmenu
    etch.getScheduler().updateDocument(this.scrollIntoViewIfNeeded.bind(this))
  }

  scrollIntoViewIfNeeded() {
    if (this.selected) {
      this.element.scrollIntoViewIfNeeded(false)
    }
  }
}

module.exports = SelectListView
