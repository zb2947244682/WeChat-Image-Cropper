// index.js
Page({
  data: {
    showCropper: false,
    croppedImage: '',
    // 裁切模式配置
    cropperConfig: {
      aspectRatio: 0, // 0为自由裁切，其他值为固定比例
      fullscreen: false
    }
  },

  // 打开图片裁切 - 自由裁切
  openCropper() {
    this.setData({
      showCropper: true,
      'cropperConfig.aspectRatio': 0,
      'cropperConfig.fullscreen': false
    });
  },

  // 打开全屏自由裁切
  openFullscreenCropper() {
    this.setData({
      showCropper: true,
      'cropperConfig.aspectRatio': 0,
      'cropperConfig.fullscreen': true
    });
  },

  // 打开1:1比例裁切
  openSquareCropper() {
    this.setData({
      showCropper: true,
      'cropperConfig.aspectRatio': 1,
      'cropperConfig.fullscreen': false
    });
  },

  // 打开16:9比例裁切
  openWideCropper() {
    this.setData({
      showCropper: true,
      'cropperConfig.aspectRatio': 16/9,
      'cropperConfig.fullscreen': false
    });
  },

  // 打开4:3比例裁切
  openClassicCropper() {
    this.setData({
      showCropper: true,
      'cropperConfig.aspectRatio': 4/3,
      'cropperConfig.fullscreen': false
    });
  },

  // 显示图片裁切组件
  showImageCropper() {
    this.setData({
      showCropper: true
    });
  },

  // 图片裁切完成回调
  onCropped(e) {
    const { tempFilePath } = e.detail;
    this.setData({
      croppedImage: tempFilePath,
      showCropper: false
    });
  },

  // 取消裁切回调
  onCropCancel() {
    console.log('取消裁切');
    this.setData({
      showCropper: false
    });
  }
})
