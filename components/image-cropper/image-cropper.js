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
    },
    // 裁切比例 (宽/高)，不传则为自由裁切
    aspectRatio: {
      type: Number,
      value: 0
    },
    // 是否全屏模式
    fullscreen: {
      type: Boolean,
      value: false
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
    lastTouchTime: 0,
    // 是否已自动选择图片
    autoSelected: false
  },

  // 组件生命周期
  lifetimes: {
    attached() {
      // 组件初始化时的逻辑
    }
  },

  // 监听属性变化
  observers: {
    'show': function(show) {
      if (show && !this.data.autoSelected) {
        // 显示组件时自动选择图片
        this.setData({ autoSelected: true });
        setTimeout(() => {
          this.chooseImage();
        }, 100);
      } else if (!show) {
        // 隐藏组件时重置状态
        this.setData({ 
          autoSelected: false,
          imageSrc: '',
          isDragging: false,
          isResizing: false
        });
      }
    }
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
        },
        fail: () => {
          // 用户取消选择图片时关闭组件
          this.cancel();
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
          
          let canvasWidth, canvasHeight;
          
          if (this.properties.fullscreen) {
            // 全屏模式：Canvas撑满整个屏幕
            canvasWidth = screenWidth;
            canvasHeight = screenHeight;
          } else {
            // 普通模式：计算最大可用尺寸（考虑padding和其他UI元素）
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
            
            canvasWidth = width;
            canvasHeight = height;
          }

          // 初始化裁切框
          let cropBox;
          if (this.properties.aspectRatio > 0) {
            // 固定比例裁切
            const aspectRatio = this.properties.aspectRatio;
            let cropWidth, cropHeight;
            
            // 根据Canvas尺寸和比例计算裁切框大小
            const canvasAspectRatio = canvasWidth / canvasHeight;
            if (aspectRatio > canvasAspectRatio) {
              // 裁切框较宽
              cropWidth = canvasWidth * 0.8;
              cropHeight = cropWidth / aspectRatio;
            } else {
              // 裁切框较高
              cropHeight = canvasHeight * 0.8;
              cropWidth = cropHeight * aspectRatio;
            }
            
            cropBox = {
              x: (canvasWidth - cropWidth) / 2,
              y: (canvasHeight - cropHeight) / 2,
              width: cropWidth,
              height: cropHeight
            };
          } else {
            // 自由裁切：正方形裁切框
            const cropSize = Math.min(canvasWidth, canvasHeight) * 0.6;
            cropBox = {
              x: (canvasWidth - cropSize) / 2,
              y: (canvasHeight - cropSize) / 2,
              width: cropSize,
              height: cropSize
            };
          }

          this.setData({
            imageSrc: src,
            imageWidth: res.width,
            imageHeight: res.height,
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            cropBox: cropBox
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
      const handleSize = 20; // 增大控制点尺寸
      const innerSize = 12;
      
      // 四个角的控制点
      const handles = [
        { x: cropBox.x - handleSize/2, y: cropBox.y - handleSize/2 }, // 左上
        { x: cropBox.x + cropBox.width - handleSize/2, y: cropBox.y - handleSize/2 }, // 右上
        { x: cropBox.x - handleSize/2, y: cropBox.y + cropBox.height - handleSize/2 }, // 左下
        { x: cropBox.x + cropBox.width - handleSize/2, y: cropBox.y + cropBox.height - handleSize/2 } // 右下
      ];
      
      handles.forEach(handle => {
        // 绘制阴影效果
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // 外圈白色
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        
        // 清除阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
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
      const handleSize = 20; // 与drawHandles中的尺寸保持一致
      const touchTolerance = 30; // 进一步增加触摸容错范围
      
      // 检查是否点击了控制点
      const handles = [
        { type: 'tl', x: cropBox.x, y: cropBox.y },
        { type: 'tr', x: cropBox.x + cropBox.width, y: cropBox.y },
        { type: 'bl', x: cropBox.x, y: cropBox.y + cropBox.height },
        { type: 'br', x: cropBox.x + cropBox.width, y: cropBox.y + cropBox.height }
      ];
      
      let hitHandle = null;
      let minDistance = Infinity;
      
      // 找到最近的控制点
      for (let handle of handles) {
        const distance = Math.sqrt(
          Math.pow(touch.x - handle.x, 2) + Math.pow(touch.y - handle.y, 2)
        );
        if (distance <= touchTolerance && distance < minDistance) {
          hitHandle = handle.type;
          minDistance = distance;
        }
      }
      
      if (hitHandle) {
        this.setData({
          isResizing: true,
          resizeHandle: hitHandle,
          dragStart: { x: touch.x, y: touch.y }
        });
        return;
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
          const aspectRatio = this.properties.aspectRatio;
          
          if (aspectRatio > 0) {
            // 固定比例模式
            let newWidth, newHeight;
            
            switch (this.data.resizeHandle) {
              case 'tl':
              case 'br':
                // 对角线调整，以较大的变化量为准
                const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2;
                const direction = (this.data.resizeHandle === 'tl') ? -1 : 1;
                newWidth = Math.max(minSize, cropBox.width + direction * avgDelta);
                newHeight = newWidth / aspectRatio;
                break;
              case 'tr':
              case 'bl':
                const avgDelta2 = (Math.abs(deltaX) + Math.abs(deltaY)) / 2;
                const direction2 = (this.data.resizeHandle === 'bl') ? -1 : 1;
                newWidth = Math.max(minSize, cropBox.width + direction2 * avgDelta2);
                newHeight = newWidth / aspectRatio;
                break;
            }
            
            // 确保最小尺寸
            if (newHeight < minSize) {
              newHeight = minSize;
              newWidth = newHeight * aspectRatio;
            }
            
            // 根据调整方向更新位置
            switch (this.data.resizeHandle) {
              case 'tl':
                newCropBox.x = cropBox.x + (cropBox.width - newWidth);
                newCropBox.y = cropBox.y + (cropBox.height - newHeight);
                break;
              case 'tr':
                newCropBox.y = cropBox.y + (cropBox.height - newHeight);
                break;
              case 'bl':
                newCropBox.x = cropBox.x + (cropBox.width - newWidth);
                break;
              case 'br':
                // 位置不变
                break;
            }
            
            newCropBox.width = newWidth;
            newCropBox.height = newHeight;
            
          } else {
            // 自由裁切模式
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
          }
          
          // 优化边界检查 - 确保裁切框完全在Canvas内
          // 首先限制尺寸
          newCropBox.width = Math.max(minSize, Math.min(newCropBox.width, canvasWidth));
          newCropBox.height = Math.max(minSize, Math.min(newCropBox.height, canvasHeight));
          
          // 然后限制位置
          newCropBox.x = Math.max(0, Math.min(newCropBox.x, canvasWidth - newCropBox.width));
          newCropBox.y = Math.max(0, Math.min(newCropBox.y, canvasHeight - newCropBox.height));
          
          // 在固定比例模式下，如果边界限制导致比例失调，需要重新调整
          if (aspectRatio > 0) {
            const currentRatio = newCropBox.width / newCropBox.height;
            if (Math.abs(currentRatio - aspectRatio) > 0.01) {
              // 比例失调，以较小的维度为准重新计算
              if (newCropBox.width / aspectRatio > newCropBox.height) {
                newCropBox.width = newCropBox.height * aspectRatio;
              } else {
                newCropBox.height = newCropBox.width / aspectRatio;
              }
              
              // 重新检查位置
              newCropBox.x = Math.max(0, Math.min(newCropBox.x, canvasWidth - newCropBox.width));
              newCropBox.y = Math.max(0, Math.min(newCropBox.y, canvasHeight - newCropBox.height));
            }
          }
          
          // 直接更新数据
          this.data.cropBox = newCropBox;
          
          // 只更新遮罩Canvas，不重绘图片
          this.updateMaskCanvas();
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
