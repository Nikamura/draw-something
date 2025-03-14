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
    this.activeTool = 'brush'; // 'brush' or 'fill'
    
    this._initCanvas();
    this._setupEventListeners();
  }

  /**
   * Initialize the canvas size and context
   * @private
   */
  _initCanvas() {
    // Set canvas to fixed size
    this.canvas.width = CONFIG.CANVAS_WIDTH;
    this.canvas.height = CONFIG.CANVAS_HEIGHT;
    
    // Set default styles
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.brushSize;
    
    console.log('Canvas initialized with fixed size:', {
      width: this.canvas.width,
      height: this.canvas.height
    });
    
    // Draw a test line to ensure canvas is working
    this.ctx.beginPath();
    this.ctx.moveTo(10, 10);
    this.ctx.lineTo(50, 50);
    this.ctx.stroke();
    this.ctx.closePath();
    console.log('Drew test line on canvas');
    
    // Clear the test line
    setTimeout(() => {
      this.clear(false);
    }, 500);
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
    
    // Remove resize event listener - we want fixed canvas size
    // window.addEventListener('resize', this._resizeCanvas.bind(this));
  }

  /**
   * Handle mouse down event
   * @private
   * @param {MouseEvent} e - The mouse event
   */
  _handleMouseDown(e) {
    if (!this.isEnabled) {
      console.log('Mouse down ignored - drawing not enabled');
      return;
    }
    
    console.log('Mouse down - starting drawing');
    const pos = this._getMousePosition(e);
    
    if (this.activeTool === 'fill') {
      console.log('Using fill tool at', pos.x, pos.y);
      
      // Check if we're clicking on a line
      if (this._isClickOnLine(pos.x, pos.y)) {
        console.log('Clicked on a line, changing line color');
        this._changeLineColor(pos.x, pos.y);
      } else {
        // Regular flood fill
        this._floodFill(pos.x, pos.y);
      }
      return;
    }
    
    this.isDrawing = true;
    console.log('Starting path at', pos.x, pos.y);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
    
    // Draw a small dot at the start point
    this.ctx.arc(pos.x, pos.y, this.brushSize / 2, 0, Math.PI * 2);
    this.ctx.fill();
    
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
   * @param {string} type - The type of action (start, move, end, fill)
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
    const wasEnabled = this.isEnabled;
    this.isEnabled = enabled;
    this.canvas.style.cursor = enabled ? 'crosshair' : 'default';
    
    console.log(`Canvas drawing ${enabled ? 'enabled' : 'disabled'} (was ${wasEnabled ? 'enabled' : 'disabled'})`);
    
    // Draw a small indicator in the corner to show if drawing is enabled
    this.ctx.save();
    this.ctx.fillStyle = enabled ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
    this.ctx.fillRect(5, 5, 10, 10);
    this.ctx.restore();
    
    // Reset the indicator after a short delay
    setTimeout(() => {
      this.ctx.save();
      this.ctx.clearRect(5, 5, 10, 10);
      this.ctx.restore();
    }, 1000);
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
    console.log('Processing draw data:', drawData);
    
    if (!drawData || !Array.isArray(drawData) || drawData.length === 0) {
      console.error('Invalid draw data received:', drawData);
      return;
    }
    
    drawData.forEach(action => {
      console.log('Processing action:', action);
      
      if (action.type === 'clear') {
        console.log('Clearing canvas');
        this.clear(false);
        return;
      }
      
      // Set styles for this action
      this.ctx.strokeStyle = action.color || this.color;
      this.ctx.lineWidth = action.size || this.brushSize;
      
      if (action.type === 'start') {
        console.log('Starting path at', action.x, action.y);
        this.ctx.beginPath();
        this.ctx.moveTo(action.x, action.y);
        
        // Draw a small dot at the start point
        this.ctx.arc(action.x, action.y, (action.size || this.brushSize) / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (action.type === 'move') {
        console.log('Drawing line to', action.x, action.y);
        this.ctx.lineTo(action.x, action.y);
        this.ctx.stroke();
      } else if (action.type === 'end') {
        console.log('Ending path');
        this.ctx.closePath();
      } else if (action.type === 'fill') {
        console.log('Filling at', action.x, action.y);
        this.color = action.color || this.color;
        this._floodFill(action.x, action.y);
      } else if (action.type === 'lineColor') {
        console.log('Changing line color at', action.x, action.y);
        this.color = action.color || this.color;
        this._changeLineColor(action.x, action.y);
      } else {
        console.warn('Unknown action type:', action.type);
      }
    });
    
    // Reset to current user's styles
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.brushSize;
  }

  /**
   * Get the current canvas as a data URL
   * @returns {string} Canvas data URL
   */
  getCanvasImage() {
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Perform flood fill at the given coordinates
   * @private
   * @param {number} startX - The x coordinate to start filling from
   * @param {number} startY - The y coordinate to start filling from
   */
  _floodFill(startX, startY) {
    // Get the image data
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Convert hex color to RGBA
    const fillColor = this._hexToRgba(this.color);
    
    // Get the color at the target pixel
    const targetColor = this._getPixelColor(imageData, startX, startY);
    
    // Don't fill if the target color is the same as the fill color
    if (this._colorsMatch(targetColor, fillColor)) {
      console.log('Target color matches fill color, not filling');
      return;
    }
    
    // Stack for flood fill algorithm
    const stack = [{x: Math.floor(startX), y: Math.floor(startY)}];
    const visited = new Set();
    
    // Flood fill algorithm
    while (stack.length > 0) {
      const {x, y} = stack.pop();
      const pixelPos = (y * width + x) * 4;
      
      // Skip if out of bounds or already visited
      if (x < 0 || x >= width || y < 0 || y >= height || visited.has(`${x},${y}`)) {
        continue;
      }
      
      // Check if the current pixel matches the target color
      const currentColor = [
        data[pixelPos],
        data[pixelPos + 1],
        data[pixelPos + 2],
        data[pixelPos + 3]
      ];
      
      if (!this._colorsMatch(currentColor, targetColor)) {
        continue;
      }
      
      // Mark as visited
      visited.add(`${x},${y}`);
      
      // Set the pixel color
      data[pixelPos] = fillColor[0];
      data[pixelPos + 1] = fillColor[1];
      data[pixelPos + 2] = fillColor[2];
      data[pixelPos + 3] = fillColor[3];
      
      // Add neighboring pixels to the stack
      stack.push({x: x + 1, y: y});
      stack.push({x: x - 1, y: y});
      stack.push({x: x, y: y + 1});
      stack.push({x: x, y: y - 1});
    }
    
    // Put the modified image data back
    this.ctx.putImageData(imageData, 0, 0);
    
    // Add to draw buffer
    this._addToDrawBuffer('fill', startX, startY);
  }
  
  /**
   * Get the color of a pixel in the image data
   * @private
   * @param {ImageData} imageData - The image data
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @returns {Array} - The RGBA color values
   */
  _getPixelColor(imageData, x, y) {
    const data = imageData.data;
    const width = imageData.width;
    const pixelPos = (Math.floor(y) * width + Math.floor(x)) * 4;
    
    return [
      data[pixelPos],
      data[pixelPos + 1],
      data[pixelPos + 2],
      data[pixelPos + 3]
    ];
  }
  
  /**
   * Check if two colors match
   * @private
   * @param {Array} color1 - The first color as [r, g, b, a]
   * @param {Array} color2 - The second color as [r, g, b, a]
   * @returns {boolean} - Whether the colors match
   */
  _colorsMatch(color1, color2) {
    const threshold = 10; // Allow some tolerance for anti-aliasing
    
    return Math.abs(color1[0] - color2[0]) <= threshold &&
           Math.abs(color1[1] - color2[1]) <= threshold &&
           Math.abs(color1[2] - color2[2]) <= threshold &&
           Math.abs(color1[3] - color2[3]) <= threshold;
  }
  
  /**
   * Convert hex color to RGBA
   * @private
   * @param {string} hex - The hex color string
   * @returns {Array} - The RGBA color values
   */
  _hexToRgba(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return [r, g, b, 255]; // Full opacity
  }

  /**
   * Set the active tool
   * @param {string} tool - The tool to activate ('brush' or 'fill')
   */
  setActiveTool(tool) {
    if (tool !== 'brush' && tool !== 'fill') {
      console.error('Invalid tool:', tool);
      return;
    }
    
    this.activeTool = tool;
    console.log(`Active tool set to ${tool}`);
    
    // Update cursor based on tool
    this.canvas.style.cursor = this.isEnabled ? 
      (tool === 'brush' ? 'crosshair' : 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M7.97 16.95c-.93-.97-.93-2.55 0-3.52l2.51-2.51c.09-.09.23-.09.32 0l3.52 3.52c.09.09.09.23 0 .32l-2.51 2.51c-.97.93-2.55.93-3.52 0z\'/%3E%3C/svg%3E") 0 24, pointer') : 
      'default';
  }

  /**
   * Check if the click is on a line
   * @private
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @returns {boolean} - Whether the click is on a line
   */
  _isClickOnLine(x, y) {
    // Get the image data around the click point
    const radius = 5; // Check within a small radius
    const imageData = this.ctx.getImageData(
      Math.max(0, x - radius), 
      Math.max(0, y - radius), 
      radius * 2, 
      radius * 2
    );
    
    const data = imageData.data;
    const width = imageData.width;
    
    // Get the color at the click point (center of the area)
    const centerX = Math.min(radius, x);
    const centerY = Math.min(radius, y);
    const centerColor = this._getPixelColor(imageData, centerX, centerY);
    
    // If the center pixel is transparent, it's not a line
    if (centerColor[3] < 10) {
      return false;
    }
    
    // Check if there are transparent pixels around the click point
    // This helps determine if it's a line (has transparent neighbors) vs a filled area
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip center pixel
        
        const checkX = centerX + dx;
        const checkY = centerY + dy;
        
        // Skip if out of bounds
        if (checkX < 0 || checkX >= width || checkY < 0 || checkY >= width) {
          continue;
        }
        
        const neighborColor = this._getPixelColor(imageData, checkX, checkY);
        
        // If we find a transparent neighbor, it's likely a line
        if (neighborColor[3] < 10) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Change the color of a line
   * @private
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   */
  _changeLineColor(x, y) {
    // Get the image data
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Convert hex color to RGBA
    const fillColor = this._hexToRgba(this.color);
    
    // Get the color at the target pixel
    const targetColor = this._getPixelColor(imageData, x, y);
    
    // Don't change if the target color is the same as the fill color
    if (this._colorsMatch(targetColor, fillColor)) {
      console.log('Target color matches fill color, not changing');
      return;
    }
    
    // Stack for connected component algorithm
    const stack = [{x: Math.floor(x), y: Math.floor(y)}];
    const visited = new Set();
    
    // Connected component algorithm to find the line
    while (stack.length > 0) {
      const {x, y} = stack.pop();
      const pixelPos = (y * width + x) * 4;
      
      // Skip if out of bounds or already visited
      if (x < 0 || x >= width || y < 0 || y >= height || visited.has(`${x},${y}`)) {
        continue;
      }
      
      // Check if the current pixel matches the target color
      const currentColor = [
        data[pixelPos],
        data[pixelPos + 1],
        data[pixelPos + 2],
        data[pixelPos + 3]
      ];
      
      // Skip transparent pixels and pixels that don't match the target color
      if (currentColor[3] < 10 || !this._colorsMatch(currentColor, targetColor)) {
        continue;
      }
      
      // Mark as visited
      visited.add(`${x},${y}`);
      
      // Set the pixel color
      data[pixelPos] = fillColor[0];
      data[pixelPos + 1] = fillColor[1];
      data[pixelPos + 2] = fillColor[2];
      data[pixelPos + 3] = fillColor[3];
      
      // Add neighboring pixels to the stack (8-connected)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          stack.push({x: x + dx, y: y + dy});
        }
      }
    }
    
    // Put the modified image data back
    this.ctx.putImageData(imageData, 0, 0);
    
    // Add to draw buffer
    this._addToDrawBuffer('lineColor', x, y);
  }
} 