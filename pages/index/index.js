// index.js
Page({
  data: {
    showCropper: false,
    croppedImage: ''
  },

  // 显示图片裁切组件
  showImageCropper() {
    this.setData({
      showCropper: true
    });
  },

  // 裁切完成回调
  onImageCropped(e) {
    console.log('裁切完成:', e.detail);
    const { tempFilePath, width, height } = e.detail;
    
    this.setData({
      croppedImage: tempFilePath
    });
    
    // 显示裁切成功提示
    wx.showToast({
      title: '裁切成功',
      icon: 'success'
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
