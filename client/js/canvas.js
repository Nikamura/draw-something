/**
 * Canvas module for handling drawing functionality
 */
class Canvas {
  /**
   * Initialize the canvas
   * @param {HTMLCanvasElement} canvasElement - The canvas element
   * @param {Function} onDrawCallback - Callback for when drawing occurs
   */
  constructor(canvasElement, onDrawCallback) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.onDraw = onDrawCallback;
    this.isDrawing = false;
    this.isEnabled = false;
    this.color = CONFIG.DEFAULT_COLOR;
    this.brushSize = CONFIG.DEFAULT_BRUSH_SIZE;
    this.drawBuffer = [];
    this.bufferTimeout = null;
    
    this._initCanvas();
    this._setupEventListeners();
  }

  /**
   * Initialize the canvas size and context
   * @private
   */
  _initCanvas() {
    // Set canvas size to match container
    this._resizeCanvas();
    
    // Set default styles
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.brushSize;
  }

  /**
   * Set up event listeners for drawing
   * @private
   */
  _setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this._handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this._handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this._handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseout', this._handleMouseUp.bind(this));
    
    // Touch events
    this.canvas.addEventListener('touchstart', this._handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this._handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this._handleTouchEnd.bind(this));
    
    // Resize event
    window.addEventListener('resize', this._resizeCanvas.bind(this));
  }

  /**
   * Resize the canvas to match its container
   * @private
   */
  _resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    
    // Redraw any existing content if needed
  }

  /**
   * Handle mouse down event
   * @private
   * @param {MouseEvent} e - The mouse event
   */
  _handleMouseDown(e) {
    if (!this.isEnabled) return;
    
    this.isDrawing = true;
    const pos = this._getMousePosition(e);
    
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
    
    // Add to draw buffer
    this._addToDrawBuffer('start', pos.x, pos.y);
  }

  /**
   * Handle mouse move event
   * @private
   * @param {MouseEvent} e - The mouse event
   */
  _handleMouseMove(e) {
    if (!this.isEnabled || !this.isDrawing) return;
    
    const pos = this._getMousePosition(e);
    
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    
    // Add to draw buffer
    this._addToDrawBuffer('move', pos.x, pos.y);
  }

  /**
   * Handle mouse up event
   * @private
   * @param {MouseEvent} e - The mouse event
   */
  _handleMouseUp() {
    if (!this.isEnabled) return;
    
    this.isDrawing = false;
    this.ctx.closePath();
    
    // Add to draw buffer
    this._addToDrawBuffer('end');
    
    // Force send any remaining buffer
    this._sendDrawBuffer(true);
  }

  /**
   * Handle touch start event
   * @private
   * @param {TouchEvent} e - The touch event
   */
  _handleTouchStart(e) {
    if (!this.isEnabled) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this._handleMouseDown(mouseEvent);
  }

  /**
   * Handle touch move event
   * @private
   * @param {TouchEvent} e - The touch event
   */
  _handleTouchMove(e) {
    if (!this.isEnabled) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this._handleMouseMove(mouseEvent);
  }

  /**
   * Handle touch end event
   * @private
   * @param {TouchEvent} e - The touch event
   */
  _handleTouchEnd(e) {
    if (!this.isEnabled) return;
    
    e.preventDefault();
    this._handleMouseUp();
  }

  /**
   * Get mouse position relative to canvas
   * @private
   * @param {MouseEvent} e - The mouse event
   * @returns {Object} - The x and y coordinates
   */
  _getMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  /**
   * Add drawing action to buffer
   * @private
   * @param {string} type - The type of action (start, move, end)
   * @param {number} [x] - The x coordinate
   * @param {number} [y] - The y coordinate
   */
  _addToDrawBuffer(type, x, y) {
    // Add to buffer
    this.drawBuffer.push({
      type,
      x,
      y,
      color: this.color,
      size: this.brushSize
    });
    
    // Schedule buffer send
    if (!this.bufferTimeout) {
      this.bufferTimeout = setTimeout(() => {
        this._sendDrawBuffer();
      }, CONFIG.CANVAS_BATCH_INTERVAL);
    }
  }

  /**
   * Send the draw buffer to the callback
   * @private
   * @param {boolean} [force=false] - Whether to force send even if buffer is small
   */
  _sendDrawBuffer(force = false) {
    if (this.drawBuffer.length === 0) return;
    
    // Only send if we have enough actions or force is true
    if (force || this.drawBuffer.length > 5) {
      if (this.onDraw) {
        this.onDraw([...this.drawBuffer]);
      }
      this.drawBuffer = [];
    }
    
    this.bufferTimeout = null;
  }

  /**
   * Set the brush color
   * @param {string} color - The color in hex format
   */
  setColor(color) {
    this.color = color;
    this.ctx.strokeStyle = color;
  }

  /**
   * Set the brush size
   * @param {number} size - The brush size in pixels
   */
  setBrushSize(size) {
    this.brushSize = size;
    this.ctx.lineWidth = size;
  }

  /**
   * Enable or disable drawing
   * @param {boolean} enabled - Whether drawing should be enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.canvas.style.cursor = enabled ? 'crosshair' : 'default';
  }

  /**
   * Clear the canvas
   * @param {boolean} [notify=true] - Whether to notify via callback
   */
  clear(notify = true) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (notify && this.onDraw) {
      this.onDraw([{ type: 'clear' }]);
    }
  }

  /**
   * Process drawing data from another user
   * @param {Array} drawData - Array of drawing actions
   */
  processDrawData(drawData) {
    drawData.forEach(action => {
      if (action.type === 'clear') {
        this.clear(false);
        return;
      }
      
      // Set styles for this action
      this.ctx.strokeStyle = action.color;
      this.ctx.lineWidth = action.size;
      
      if (action.type === 'start') {
        this.ctx.beginPath();
        this.ctx.moveTo(action.x, action.y);
      } else if (action.type === 'move') {
        this.ctx.lineTo(action.x, action.y);
        this.ctx.stroke();
      } else if (action.type === 'end') {
        this.ctx.closePath();
      }
    });
    
    // Reset to current user's styles
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.brushSize;
  }
} 