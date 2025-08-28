Component({
  properties: {
    // 是否显示组件
    show: {
      type: Boolean,
      value: false
    },
    // 裁切框的最小尺寸
    minSize: {
      type: Number,
      value: 100
    },
    // 输出图片质量 0-1
    quality: {
      type: Number,
      value: 0.8
    }
  },

  data: {
    imageSrc: '',
    imageWidth: 0,
    imageHeight: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    cropBox: {
      x: 50,
      y: 50,
      width: 200,
      height: 200
    },
    isDragging: false,
    isResizing: false,
    dragStart: { x: 0, y: 0 },
    resizeHandle: '',
    // 触摸节流
    touchThrottle: null,
    lastTouchTime: 0
  },

  methods: {
    // 选择图片
    chooseImage() {
      wx.chooseImage({
        count: 1,
        sizeType: ['original'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.loadImage(tempFilePath);
        }
      });
    },

    // 加载图片
    loadImage(src) {
      wx.getImageInfo({
        src: src,
        success: (res) => {
          // 计算画布尺寸，限制最大尺寸
          const maxWidth = 350;
          const maxHeight = 400;
          let { width, height } = res;
          
          if (width > maxWidth) {
            height = height * maxWidth / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = width * maxHeight / height;
            height = maxHeight;
          }

          this.setData({
            imageSrc: src,
            imageWidth: res.width,
            imageHeight: res.height,
            canvasWidth: width,
            canvasHeight: height,
            cropBox: {
              x: width * 0.1,
              y: height * 0.1,
              width: width * 0.6,
              height: width * 0.6
            }
          });
          
          this.drawCanvas();
        }
      });
    },

    // 绘制画布
    drawCanvas() {
      const query = this.createSelectorQuery();
      query.select('#cropperCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0] || !res[0].node) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.data.canvasWidth;
        canvas.height = this.data.canvasHeight;

        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制图片
        if (this.data.imageSrc) {
          const img = canvas.createImage();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            this.drawCropBox(ctx);
          };
          img.src = this.data.imageSrc;
        }
      });
    },

    // 绘制裁切框
    drawCropBox(ctx) {
      const { cropBox, canvasWidth, canvasHeight } = this.data;
      
      // 绘制遮罩
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // 清除裁切区域的遮罩
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
      
      // 重置混合模式
      ctx.globalCompositeOperation = 'source-over';
      
      // 绘制裁切框边框
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
      
      // 绘制角落控制点
      this.drawHandles(ctx);
    },

    // 绘制控制点
    drawHandles(ctx) {
      const { cropBox } = this.data;
      const handleSize = 10;
      
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#007aff';
      ctx.lineWidth = 2;
      
      // 四个角的控制点
      const handles = [
        { x: cropBox.x - handleSize/2, y: cropBox.y - handleSize/2 }, // 左上
        { x: cropBox.x + cropBox.width - handleSize/2, y: cropBox.y - handleSize/2 }, // 右上
        { x: cropBox.x - handleSize/2, y: cropBox.y + cropBox.height - handleSize/2 }, // 左下
        { x: cropBox.x + cropBox.width - handleSize/2, y: cropBox.y + cropBox.height - handleSize/2 } // 右下
      ];
      
      handles.forEach(handle => {
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
      });
    },

    // 触摸节流函数
    throttleTouch(callback) {
      const now = Date.now();
      if (now - this.data.lastTouchTime > 8) { // 120fps触摸响应
        callback();
        this.setData({ lastTouchTime: now });
      }
    },

    // 触摸开始
    onTouchStart(e) {
      const touch = e.touches[0];
      const { cropBox } = this.data;
      const handleSize = 10;
      
      // 检查是否点击了控制点
      const handles = [
        { type: 'tl', x: cropBox.x, y: cropBox.y },
        { type: 'tr', x: cropBox.x + cropBox.width, y: cropBox.y },
        { type: 'bl', x: cropBox.x, y: cropBox.y + cropBox.height },
        { type: 'br', x: cropBox.x + cropBox.width, y: cropBox.y + cropBox.height }
      ];
      
      for (let handle of handles) {
        if (Math.abs(touch.x - handle.x) <= handleSize && 
            Math.abs(touch.y - handle.y) <= handleSize) {
          this.setData({
            isResizing: true,
            resizeHandle: handle.type,
            dragStart: { x: touch.x, y: touch.y }
          });
          return;
        }
      }
      
      // 检查是否点击了裁切框内部
      if (touch.x >= cropBox.x && touch.x <= cropBox.x + cropBox.width &&
          touch.y >= cropBox.y && touch.y <= cropBox.y + cropBox.height) {
        this.setData({
          isDragging: true,
          dragStart: { x: touch.x - cropBox.x, y: touch.y - cropBox.y }
        });
      }
    },

    // 触摸移动
    onTouchMove(e) {
      const touch = e.touches[0];
      const { isDragging, isResizing, dragStart, cropBox, canvasWidth, canvasHeight, minSize } = this.data;
      
      if (isDragging) {
        // 移动裁切框
        this.throttleTouch(() => {
          let newX = touch.x - dragStart.x;
          let newY = touch.y - dragStart.y;
          
          // 边界检查
          newX = Math.max(0, Math.min(newX, canvasWidth - cropBox.width));
          newY = Math.max(0, Math.min(newY, canvasHeight - cropBox.height));
          
          // 直接更新数据
          this.data.cropBox.x = newX;
          this.data.cropBox.y = newY;
          
          // 重新绘制整个画布
          this.drawCanvas();
        });
      } else if (isResizing) {
        // 调整裁切框大小
        this.throttleTouch(() => {
          const deltaX = touch.x - dragStart.x;
          const deltaY = touch.y - dragStart.y;
          let newCropBox = { ...cropBox };
          
          switch (this.data.resizeHandle) {
            case 'tl':
              newCropBox.width = Math.max(minSize, cropBox.width - deltaX);
              newCropBox.height = Math.max(minSize, cropBox.height - deltaY);
              newCropBox.x = cropBox.x + cropBox.width - newCropBox.width;
              newCropBox.y = cropBox.y + cropBox.height - newCropBox.height;
              break;
            case 'tr':
              newCropBox.width = Math.max(minSize, cropBox.width + deltaX);
              newCropBox.height = Math.max(minSize, cropBox.height - deltaY);
              newCropBox.y = cropBox.y + cropBox.height - newCropBox.height;
              break;
            case 'bl':
              newCropBox.width = Math.max(minSize, cropBox.width - deltaX);
              newCropBox.height = Math.max(minSize, cropBox.height + deltaY);
              newCropBox.x = cropBox.x + cropBox.width - newCropBox.width;
              break;
            case 'br':
              newCropBox.width = Math.max(minSize, cropBox.width + deltaX);
              newCropBox.height = Math.max(minSize, cropBox.height + deltaY);
              break;
          }
          
          // 边界检查
          if (newCropBox.x >= 0 && newCropBox.y >= 0 && 
              newCropBox.x + newCropBox.width <= canvasWidth &&
              newCropBox.y + newCropBox.height <= canvasHeight) {
            // 直接更新数据
            this.data.cropBox = newCropBox;
            
            // 重新绘制整个画布
            this.drawCanvas();
          }
        });
      }
    },

    // 触摸结束
    onTouchEnd() {
      // 触摸结束后更新UI状态
      this.setData({
        isDragging: false,
        isResizing: false,
        resizeHandle: '',
        cropBox: this.data.cropBox
      });
    },

    // 确认裁切
    confirmCrop() {
      const { imageSrc, cropBox, canvasWidth, canvasHeight, imageWidth, imageHeight, quality } = this.data;
      
      // 计算实际裁切区域
      const scaleX = imageWidth / canvasWidth;
      const scaleY = imageHeight / canvasHeight;
      const realCropBox = {
        x: cropBox.x * scaleX,
        y: cropBox.y * scaleY,
        width: cropBox.width * scaleX,
        height: cropBox.height * scaleY
      };
      
      // 创建临时canvas进行裁切
      const query = this.createSelectorQuery();
      query.select('#tempCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0] || !res[0].node) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        canvas.width = realCropBox.width;
        canvas.height = realCropBox.height;
        
        const img = canvas.createImage();
        img.onload = () => {
          ctx.drawImage(
            img,
            realCropBox.x, realCropBox.y, realCropBox.width, realCropBox.height,
            0, 0, realCropBox.width, realCropBox.height
          );
          
          // 转换为临时文件
          wx.canvasToTempFilePath({
            canvas: canvas,
            quality: quality,
            success: (res) => {
              this.triggerEvent('cropped', {
                tempFilePath: res.tempFilePath,
                width: realCropBox.width,
                height: realCropBox.height
              });
              this.close();
            }
          });
        };
        img.src = imageSrc;
      });
    },

    // 取消
    cancel() {
      this.triggerEvent('cancel');
      this.close();
    },

    // 关闭组件
    close() {
      this.setData({
        show: false,
        imageSrc: '',
        isDragging: false,
        isResizing: false
      });
    }
  }
});
