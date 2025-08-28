// index.js
Page({
  data: {
    showCropper: false,
    croppedImage: '',
    selectedImagePath: '', // 选择的图片路径
    // 裁切模式配置
    cropperConfig: {
      aspectRatio: 0, // 0为自由裁切，其他值为固定比例
      fullscreen: false
    }
  },

  // 直接选择图片并开始自由裁切
  openCropper() {
    this.chooseImageAndCrop(0, false);
  },

  // 直接选择图片并开始全屏自由裁切
  openFullscreenCropper() {
    this.chooseImageAndCrop(0, true);
  },

  // 直接选择图片并开始1:1比例裁切
  openSquareCropper() {
    this.chooseImageAndCrop(1, false);
  },

  // 直接选择图片并开始16:9比例裁切
  openWideCropper() {
    this.chooseImageAndCrop(16/9, false);
  },

  // 直接选择图片并开始4:3比例裁切
  openClassicCropper() {
    this.chooseImageAndCrop(4/3, false);
  },

  // 选择图片并开始裁切的通用方法
  chooseImageAndCrop(aspectRatio, fullscreen) {
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 选择成功后显示裁切组件
        this.setData({
          showCropper: true,
          'cropperConfig.aspectRatio': aspectRatio,
          'cropperConfig.fullscreen': fullscreen,
          selectedImagePath: res.tempFilePaths[0]
        });
      },
      fail: () => {
        // 用户取消选择，不做任何操作
        console.log('用户取消选择图片');
      }
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
