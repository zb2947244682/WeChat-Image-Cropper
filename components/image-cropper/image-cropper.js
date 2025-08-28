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
          // 获取系统信息进行响应式计算
          const systemInfo = wx.getSystemInfoSync();
          const screenWidth = systemInfo.screenWidth;
          const screenHeight = systemInfo.screenHeight;
          
          // 计算最大可用尺寸（考虑padding和其他UI元素）
          const maxWidth = Math.min(screenWidth * 0.8, 600);
          const maxHeight = Math.min(screenHeight * 0.5, 500);
          
          let { width, height } = res;
          const aspectRatio = width / height;
          
          // 按比例缩放，保持宽高比
          if (width > height) {
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
            if (height > maxHeight) {
              height = maxHeight;
              width = height * aspectRatio;
            }
          } else {
            height = Math.min(height, maxHeight);
            width = height * aspectRatio;
            if (width > maxWidth) {
              width = maxWidth;
              height = width / aspectRatio;
            }
          }

          // 初始化裁切框（居中，占图片的60%）
          const cropSize = Math.min(width, height) * 0.6;
          const cropX = (width - cropSize) / 2;
          const cropY = (height - cropSize) / 2;

          this.setData({
            imageSrc: src,
            imageWidth: res.width,
            imageHeight: res.height,
            canvasWidth: width,
            canvasHeight: height,
            cropBox: {
              x: cropX,
              y: cropY,
              width: cropSize,
              height: cropSize
            }
          });
          
          this.initCanvases();
        }
      });
    },

    // 初始化双Canvas
    initCanvases() {
      // 初始化图片Canvas
      this.initImageCanvas();
      // 初始化遮罩Canvas
      this.initMaskCanvas();
    },

    // 初始化图片Canvas（只绘制一次）
    initImageCanvas() {
      const query = this.createSelectorQuery();
      query.select('#imageCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0] || !res[0].node) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.data.canvasWidth;
        canvas.height = this.data.canvasHeight;

        // 绘制图片
        if (this.data.imageSrc) {
          const img = canvas.createImage();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = this.data.imageSrc;
        }
      });
    },

    // 初始化遮罩Canvas
    initMaskCanvas() {
      const query = this.createSelectorQuery();
      query.select('#maskCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0] || !res[0].node) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.data.canvasWidth;
        canvas.height = this.data.canvasHeight;
        
        // 绘制遮罩和裁切框
        this.drawMask(ctx);
      });
    },

    // 绘制遮罩和裁切框
    drawMask(ctx) {
      const { cropBox, canvasWidth, canvasHeight } = this.data;
      
      // 清空遮罩Canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // 绘制半透明遮罩
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // 清除裁切区域的遮罩
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
      
      // 重置混合模式
      ctx.globalCompositeOperation = 'source-over';
      
      // 绘制裁切框边框（双线效果）
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
      
      ctx.strokeStyle = '#007aff';
      ctx.lineWidth = 1;
      ctx.strokeRect(cropBox.x + 1, cropBox.y + 1, cropBox.width - 2, cropBox.height - 2);
      
      // 绘制九宫格辅助线
      this.drawGridLines(ctx);
      
      // 绘制角落控制点
      this.drawHandles(ctx);
    },

    // 绘制九宫格辅助线
    drawGridLines(ctx) {
      const { cropBox } = this.data;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      
      // 垂直线
      const verticalStep = cropBox.width / 3;
      for (let i = 1; i < 3; i++) {
        const x = cropBox.x + verticalStep * i;
        ctx.beginPath();
        ctx.moveTo(x, cropBox.y);
        ctx.lineTo(x, cropBox.y + cropBox.height);
        ctx.stroke();
      }
      
      // 水平线
      const horizontalStep = cropBox.height / 3;
      for (let i = 1; i < 3; i++) {
        const y = cropBox.y + horizontalStep * i;
        ctx.beginPath();
        ctx.moveTo(cropBox.x, y);
        ctx.lineTo(cropBox.x + cropBox.width, y);
        ctx.stroke();
      }
    },

    // 绘制控制点
    drawHandles(ctx) {
      const { cropBox } = this.data;
      const handleSize = 16;
      const innerSize = 8;
      
      // 四个角的控制点
      const handles = [
        { x: cropBox.x - handleSize/2, y: cropBox.y - handleSize/2 }, // 左上
        { x: cropBox.x + cropBox.width - handleSize/2, y: cropBox.y - handleSize/2 }, // 右上
        { x: cropBox.x - handleSize/2, y: cropBox.y + cropBox.height - handleSize/2 }, // 左下
        { x: cropBox.x + cropBox.width - handleSize/2, y: cropBox.y + cropBox.height - handleSize/2 } // 右下
      ];
      
      handles.forEach(handle => {
        // 外圈白色
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        
        // 内圈蓝色
        ctx.fillStyle = '#007aff';
        const innerOffset = (handleSize - innerSize) / 2;
        ctx.fillRect(handle.x + innerOffset, handle.y + innerOffset, innerSize, innerSize);
        
        // 边框
        ctx.strokeStyle = '#007aff';
        ctx.lineWidth = 2;
        ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
      });
    },

    // 触摸节流函数
    throttleTouch(callback) {
      const now = Date.now();
      if (now - this.data.lastTouchTime > 16) { // 60fps触摸响应，更流畅
        callback();
        this.setData({ lastTouchTime: now });
      }
    },

    // 触摸开始
    onTouchStart(e) {
      const touch = e.touches[0];
      const { cropBox } = this.data;
      const handleSize = 16;
      const touchTolerance = 20; // 增加触摸容错范围
      
      // 检查是否点击了控制点
      const handles = [
        { type: 'tl', x: cropBox.x, y: cropBox.y },
        { type: 'tr', x: cropBox.x + cropBox.width, y: cropBox.y },
        { type: 'bl', x: cropBox.x, y: cropBox.y + cropBox.height },
        { type: 'br', x: cropBox.x + cropBox.width, y: cropBox.y + cropBox.height }
      ];
      
      for (let handle of handles) {
        if (Math.abs(touch.x - handle.x) <= touchTolerance && 
            Math.abs(touch.y - handle.y) <= touchTolerance) {
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
          
          // 只更新遮罩Canvas，不重绘图片
          this.updateMaskCanvas();
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
            
            // 只更新遮罩Canvas，不重绘图片
            this.updateMaskCanvas();
          }
        });
      }
    },

    // 更新遮罩Canvas（轻量级操作）
    updateMaskCanvas() {
      const query = this.createSelectorQuery();
      query.select('#maskCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0] || !res[0].node) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 只重绘遮罩，不重绘图片
        this.drawMask(ctx);
      });
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
