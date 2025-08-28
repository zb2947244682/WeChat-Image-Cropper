# 微信小程序图片裁切组件

一个功能强大的微信小程序图片裁切组件，支持自由裁切、比例裁切、全屏裁切等多种模式。

## 功能特性

- ✨ **多种裁切模式**：支持自由裁切、固定比例裁切、全屏裁切
- 🎯 **精准控制**：优化的触摸检测，支持精确的控制点拖拽
- 📱 **移动端优化**：专为移动端设计，触摸体验流畅
- 🖼️ **全屏模式**：支持全屏裁切，黑色背景提升视觉体验
- 🔧 **易于集成**：简单的API设计，快速集成到现有项目

## 项目结构

```
MPTest/
├── components/
│   └── image-cropper/          # 图片裁切组件
│       ├── image-cropper.js    # 组件逻辑
│       ├── image-cropper.json  # 组件配置
│       ├── image-cropper.wxml  # 组件模板
│       └── image-cropper.wxss  # 组件样式
├── pages/
│   └── index/                  # 示例页面
│       ├── index.js
│       ├── index.wxml
│       ├── index.wxss
│       └── index.json
├── app.js                      # 小程序入口
├── app.json                    # 小程序配置
└── app.wxss                    # 全局样式
```

## 快速开始

### 1. 组件引入

在页面的 `json` 文件中引入组件：

```json
{
  "usingComponents": {
    "image-cropper": "/components/image-cropper/image-cropper"
  }
}
```

### 2. 基础使用

在 `wxml` 文件中使用组件：

```xml
<image-cropper
  wx:if="{{showCropper}}"
  image-path="{{selectedImagePath}}"
  aspect-ratio="{{cropperConfig.aspectRatio}}"
  fullscreen="{{cropperConfig.fullscreen}}"
  bind:cropped="onCropped"
  bind:cancel="onCropCancel"
></image-cropper>
```

在 `js` 文件中处理事件：

```javascript
Page({
  data: {
    showCropper: false,
    selectedImagePath: '',
    cropperConfig: {
      aspectRatio: 0,    // 0为自由裁切
      fullscreen: false
    }
  },

  // 选择图片并开始裁切
  chooseImageAndCrop(aspectRatio = 0, fullscreen = false) {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          selectedImagePath: res.tempFilePaths[0],
          showCropper: true,
          'cropperConfig.aspectRatio': aspectRatio,
          'cropperConfig.fullscreen': fullscreen
        });
      }
    });
  },

  // 裁切完成回调
  onCropped(e) {
    const croppedImagePath = e.detail.croppedImage;
    this.setData({
      showCropper: false,
      croppedImage: croppedImagePath
    });
  },

  // 取消裁切回调
  onCropCancel() {
    this.setData({
      showCropper: false
    });
  }
});
```

## 组件属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `image-path` | String | '' | 要裁切的图片路径 |
| `aspect-ratio` | Number | 0 | 裁切比例，0为自由裁切，其他值为宽高比 |
| `fullscreen` | Boolean | false | 是否启用全屏裁切模式 |

## 组件事件

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| `cropped` | 裁切完成时触发 | `{detail: {croppedImage: '裁切后的图片路径'}}` |
| `cancel` | 取消裁切时触发 | 无 |

## 使用示例

### 自由裁切

```javascript
// 启动自由裁切
this.chooseImageAndCrop(0, false);
```

### 1:1 比例裁切

```javascript
// 启动正方形裁切
this.chooseImageAndCrop(1, false);
```

### 16:9 比例裁切

```javascript
// 启动16:9比例裁切
this.chooseImageAndCrop(16/9, false);
```

### 全屏裁切

```javascript
// 启动全屏裁切模式
this.chooseImageAndCrop(0, true);
```

## 技术特性

### 触摸优化
- 增大控制点尺寸（20px）提升触摸精度
- 扩大触摸检测范围（30px容错）
- 智能寻找最近控制点，避免误触

### 边界检测
- 自动边界约束，防止裁切框超出图片范围
- 固定比例模式下智能调整尺寸和位置
- 流畅的拖拽体验，无卡顿现象

### 全屏模式
- 黑色背景提升视觉对比度
- 图片自适应屏幕尺寸
- 沉浸式裁切体验

## 开发环境

- 微信开发者工具
- 微信小程序基础库 2.0+

## 运行项目

1. 使用微信开发者工具打开项目目录
2. 在工具中预览或真机调试
3. 体验各种裁切模式

## 注意事项

1. 组件依赖 Canvas 2D API，请确保基础库版本支持
2. 图片路径必须是有效的本地临时路径
3. 全屏模式下建议使用较大尺寸的图片以获得更好效果
4. 裁切后的图片会保存为临时文件，如需持久化请自行处理

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个组件！