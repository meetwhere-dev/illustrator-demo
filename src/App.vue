<template>
  <div id="app">
    <div id="nav">
     <!-- 工具栏按钮  -->
      <button
      :key="index"
      v-for="(item, index) of tools"
      :class="activeTool === item ? 'active': ''"
      @click="changeTool(item)"
      >{{item}}</button>
      <button @click=" deleteItem() ">Delete</button>
      <button @click="isSmoothBezierCurve = !isSmoothBezierCurve">SwitchSmoothBezierCurve : {{isSmoothBezierCurve}}</button>
      <div>名称：{{currentItem.id}} 长度：{{currentItem.length}}</div>
    </div>
    <!-- 画布 -->
    <div>
      <canvas id="c" width="800px" height="500px" tabindex="0" ></canvas>
    </div>
    <div id="mouse_coord">坐标 X:{{mouse.coord.x.toFixed(2)}}|| Y:{{mouse.coord.y.toFixed(2)}}</div>
  </div>
</template>
<script>
import { fabric } from 'fabric'
// import _ from 'lodash'
// import Snap from 'snapsvg'

export default {
  data () {
    return {
      // 工具栏
      tools: ['Hand', 'BezierCurve', 'Line', 'Detect'],
      // 选中的工具
      activeTool: 'Hand',
      // 画布
      canvas: null,
      // 视图比例
      zoom: 1,
      // 是否正在调整视图
      isMovePan: false,
      isSmoothBezierCurve: false,
      // 鼠标及其状态相关
      mouse: {
        mouseCircle: null,
        isClick: false,
        isDragging: false,
        coord: { x: 0, y: 0 }
      },
      // 所有的元素
      allItems: [],
      // 被选中的元素
      currentItem: {
        isChange: false,
        id: '',
        target: null,
        length: 0,
        path: null,
        left: 0,
        top: 0
      },
      // 磁吸工具
      detect: {
        minDistance: 10,
        target: null,
        pointer: null
      }
    }
  },
  watch: {
    'currentItem.target': {
      handler (newVal, oldVal) {
        if (oldVal) {
          oldVal.stroke = 'black'
        }
        if (newVal) newVal.stroke = 'blue'
      },
      immediate: false
    }
  },
  methods: {

    // 初始化
    initialize () {
      // ———————————————————————生成画布 初始化画布设置————————————————————————
      const canvas = this.canvas = new fabric.Canvas('c')
      canvas.selection = false
      // 设置元素对象默认值 selectable (可被选择)
      fabric.Object.prototype.selectable = true
      // hasControls (元素对象拥有控制框架)
      fabric.Object.prototype.hasControls = false
      // hasBorders (元素对象拥有控制框线)
      fabric.Object.prototype.hasBorders = true
      fabric.Object.prototype.hoverCursor = 'default'
      fabric.Object.prototype.originX = 'center'
      fabric.Object.prototype.originY = 'center'
      fabric.Object.prototype.removeSelf = function () {
        canvas.remove(this)
      }
      fabric.Object.prototype.addSelf = function () {
        canvas.add(this)
      }
      this.canvas.on({
      // 鼠标移动事件
        'mouse:move': this.mouseMove,
        'mouse:out': this.mouseOut,
        // 鼠标按下事件
        'mouse:down': this.mouseDown,
        // 鼠标抬起事件
        'mouse:up': this.mouseUp

      })

      // 通过snap解析文件
      // console.log(Snap)
      // Snap.load('./pants_01_b_f.svg', obj => {
      //   console.log(Snap.parse(obj))
      // })
      // 通过fabric进行文件读取
      // fabric.loadSVGFromURL('./pants_01_b_f.svg', (objects, options) => {
      //   objects.forEach((obj1) => {
      //     this.relativeToAbsolute(obj1.path)
      //     let path = ''
      //     obj1.path.forEach(e => {
      //       path += e.join(' ')
      //     })
      //     const obj2 = new fabric.Path(path, {
      //       left: 200,
      //       top: 200,
      //       stroke: 'black',
      //       strokeWidth: 2
      //     })
      //     console.log(obj2)
      //     obj2.scale(0.1)
      //     obj2.addSelf()
      //     obj1.scale(0.1)
      //     obj1.set({
      //       left: 200,
      //       top: 200,
      //       stroke: 'black'
      //     })
      //     console.log(obj1)
      //     this.allItems.push(obj1)
      //   })
      // })

      // 获取上层canvas对象
      const upperCanvas = document.getElementsByClassName('upper-canvas')
      // 鼠标右键事件，并添加终止画笔工具事件
      upperCanvas[0].addEventListener('contextmenu', (e) => {
        console.log('终止画笔工具')
        this.cutNewLine()
        e.preventDefault()
        return false
      })
      // ————————————————————————文件拖拽解析生成元素————————————————————————
      // 文件拖拽解析 画布生成新元素
      upperCanvas[0].ondrop = (event) => {
        event.preventDefault()

        // 读文件
        var file = event.dataTransfer.files[0]

        // 创建一个filereader
        var reader = new FileReader()
        reader.readAsText(file)
        reader.onload = () => {
          console.log(reader.result)
          // 文本中提取SVG的d属性
          const re = /M([\s\S]*?)(?="\/>)/g
          const res = reader.result.match(re)
          res.forEach(el => {
            const resPath = new fabric.Path(el, {
              strokeWidth: 1
            })
            this.relativeToAbsolute(resPath)
            const newPath = new fabric.Path(resPath.path, {
              isChange: false,
              hoverCursor: 'default',
              objectCaching: false,
              type: 'Path',
              strokeWidth: 1,
              fill: 'transparent',
              id: +new Date(),
              stroke: 'black'
            })
            this.pathPointTemp(newPath)
            console.log('创建新的元素：', newPath.id, newPath)
            newPath.addSelf()
            resPath.removeSelf()
            this.allItems.push(newPath)
            console.log('目前画布上的元素：', this.allItems)
          })
        }
      }
      // ————————————————————————————画布缩放——————————————————————————————
      // 鼠标按下
      this.canvas.on('mouse:down', (e) => {
        // 按住alt键才可拖动画布
        if (e.e.altKey) {
          this.isMovePan = true
        }
      })

      // 鼠标抬起
      this.canvas.on('mouse:up', (e) => {
        this.isMovePan = false
      })

      // 鼠标移动
      this.canvas.on('mouse:move', (e) => {
        if (this.isMovePan && e && e.e) {
          var delta = new fabric.Point(e.e.movementX, e.e.movementY)
          this.canvas.relativePan(delta)
        }
      })

      // 鼠标滚轮监听
      this.canvas.on('mouse:wheel', (event) => {
        this.zoom = (event.e.deltaY < 0 ? 0.1 : -0.1) + this.zoom
        this.zoom = Math.max(0.1, this.zoom) // 最小为原来的1/10
        this.zoom = Math.min(3, this.zoom) // 最大是原来的3倍
        // var zoomPoint = event.absolutePointer
        const zoomPoint = new fabric.Point(300, 300)
        this.canvas.zoomToPoint(zoomPoint, this.zoom)
      })
      // ————————————————————————————————————————————————————————————————
    },
    // 创建Bezier曲线的控制圆
    bezierControlCircle (i, x, y, path) {
      const c = this.createCircle(path[i][x], path[i][y])
      c.pathIndex = i
      c.pathXY = path[i]
      c.pathX = x
      c.pathY = y
      c.on({
        moved: this.updatePath,
        moving: this.priviewBezierChange
      })
      return c
    },
    // 创建Bezier曲线的控制圆参考线
    bezierControlLine (path) {
      const line = new fabric.Line(path, {
        hoverCursor: 'default',
        selectable: false,
        hasBorders: false,
        objectCaching: false,
        hasControls: false,
        stroke: 'red',
        type: 'Line',
        strokeWidth: 1
      })
      line.sendToBack()
      line.addSelf()
      return line
    },
    // 切换工具
    changeTool (item) {
      if (this.activeTool === item) {
        console.log('点击了相同的工具')
        return true
      }

      // 切换工具时 初始化
      if (item === 'BezierCurve' || item === 'Line' || item === 'Detect') {
        // 清除正在画的线段
        // this.cutNewLine()
        console.log('切换至不可选模式')
        fabric.Object.prototype.hasBorders = false
        fabric.Object.prototype.selectable = false
      } else {
        console.log('切换至可选模式')
        fabric.Object.prototype.hasBorders = true
        fabric.Object.prototype.selectable = true
      }
      if (this.currentItem.target?.controlCircle) {
        this.currentItem.target.controlCircle.forEach(e => e.removeSelf())
      }
      this.currentItem = {
        isChange: false,
        id: '',
        target: null,
        length: 0,
        path: null,
        left: 0,
        top: 0
      }
      // 切换为点击的工具
      this.activeTool = item
    },
    // 剪短正在创建的线段
    cutNewLine () {
      if (this.currentItem.target) this.currentItem.target.removeSelf()
      if (this.currentItem.path?.length > 2) {
        this.currentItem.path.pop()
        const newLine = this.createPath(this.currentItem.path)
        this.allItems.push(newLine)
      }
      this.currentItem.path = null
    },
    // 创建新的路径
    createPath (pathArray, stroke = 'black') {
      let path = ''
      pathArray.forEach((item) => {
        path = `${path} ${item.join(' ')}`
      })
      const newLine = new fabric.Path(path, {
        isChange: false,
        hoverCursor: 'default',
        objectCaching: false,
        stroke,
        type: 'Path',
        strokeWidth: 1,
        fill: 'transparent',
        id: +new Date()
      })
      if (newLine.width < 10 || newLine.height < 10) newLine.padding = 10
      if (pathArray.length < 3 && pathArray[1][0] === 'L') {
        newLine.type = 'Line'
        newLine.length = this.getLineLength(newLine)
      }
      if (newLine.path[1][0] === 'C') {
        this.pathPointTemp(newLine)
      }
      newLine.on({
        mousedblclick: this.objDbclick,
        moved: this.objMoved,
        mousedown: this.objMouseDown,
        moving: this.objMoving
      })
      this.canvas.add(newLine)
      newLine.sendToBack()
      return newLine
    },
    // 创建Bezier曲线的控制圆以及参考线
    createBezierCurveControl (event) {
      const el = event.target
      const controllers = []
      el.controlCircle = controllers
      const path = el.path

      let circle1, circle2, circle3, line1, line2, line3
      for (let i = 1, len = path.length; i < len; i++) {
        // let line1
        if (i === 1) {
        // 第一个点
          circle1 = this.bezierControlCircle(0, 1, 2, path)
          controllers.push(circle1)
          circle1.controlLine = { center: true, line: [], othersContral: [] }
          line1 = this.bezierControlLine([path[1][1], path[1][2], path[0][1], path[0][2]])
        } else {
          line1 = this.bezierControlLine([path[i][1], path[i][2], path[i - 1][5], path[i - 1][6]])
          circle3.controlLine.line.push(line1)
        }
        circle1.controlLine.line.push(line1)
        line3 = line2 = this.bezierControlLine([path[i][3], path[i][4], path[i][5], path[i][6]])
        circle2 = this.bezierControlCircle(i, 1, 2, path)
        circle1.controlLine.othersContral.push(circle2)
        if (i === 1) {
          circle2.controlLine = { center: false, line: [line1], othersContral: [circle1] }
        } else {
          circle2.controlLine = { center: false, line: [line1, line3], othersContral: [circle1, circle3] }
          circle3.controlLine.othersContral.push(circle2)
        }
        circle1 = this.bezierControlCircle(i, 5, 6, path)
        circle3 = this.bezierControlCircle(i, 3, 4, path)
        circle1.controlLine = { center: true, line: [line2], othersContral: [circle3] }
        circle3.controlLine = { center: false, line: [line2], othersContral: [circle1] }
        controllers.push(line1, circle2, circle3, line2, circle1)
      }

      controllers.forEach((item) => {
        item.controlElement = el
      })
      return el
    },
    // 创建Line的控制圆
    createLineControl (event) {
      const el = event.target
      const controllers = []
      el.controlCircle = controllers
      const path = el.path
      function createCircle (x, y) {
        const circle = new fabric.Circle({
          left: x,
          top: y,
          radius: 6,
          fill: '#fff',
          stroke: '#666',
          strokeWidth: 1,
          hasBorders: false,
          type: 'controlCircle'
        })
        circle.addSelf()
        return circle
      }
      function priviewChange (event) {
        event.target.pathXY[event.target.pathX] = event.pointer.x
        event.target.pathXY[event.target.pathY] = event.pointer.y
        this.currentItem.length = this.getLineLength(event.target.controlElement)
      }
      function createControlCircle (i, x, y) {
        const c = createCircle(path[i][x], path[i][y])
        c.pathXY = path[i]
        c.pathX = x
        c.pathY = y
        c.on({
          moved: this.updatePath,
          moving: priviewChange.bind(this)
        })
        return c
      }
      const c0 = createControlCircle.call(this, 0, 1, 2)
      const c1 = createControlCircle.call(this, 1, 1, 2)
      controllers.push(c0, c1)
      controllers.forEach((item) => {
        item.controlElement = el
      })
    },
    // 创建控制点圆形
    createCircle (x, y) {
      const circle = new fabric.Circle({
        left: x,
        top: y,
        radius: 6,
        fill: '#fff',
        stroke: '#666',
        strokeWidth: 1,
        hasBorders: false,
        type: 'controlCircle'
      })
      this.canvas.add(circle)
      return circle
    },
    // 创建path路径的缓存
    createTemp (path) {
      const temp = []

      for (let i = 1; i < path.length; i++) {
        const x0 = path[i - 1][path[i - 1].length - 2]
        const y0 = path[i - 1][path[i - 1].length - 1]
        const x1 = path[i][1]
        const y1 = path[i][2]
        const x2 = path[i][3]
        const y2 = path[i][4]
        const x3 = path[i][5]
        const y3 = path[i][6]
        for (let t = 0.01; t < 1; t += 0.01) {
          const x = Math.pow((1 - t), 3) * x0 + 3 * t * Math.pow((1 - t), 2) * x1 + 3 * Math.pow(t, 2) * (1 - t) * x2 + Math.pow(t, 3) * x3
          const y = Math.pow((1 - t), 3) * y0 + 3 * t * Math.pow((1 - t), 2) * y1 + 3 * Math.pow(t, 2) * (1 - t) * y2 + Math.pow(t, 3) * y3
          temp.push([x.toFixed(4), y.toFixed(4)])
        }
      }
      return temp
    },
    // 磁吸曲线工具
    detectBezierCurve (el, event) {
      // 方法三 缓存曲线每个点的坐标
      el.pointTemp.forEach(point => {
        const len = this.distance(event.absolutePointer, { x: point[0], y: point[1] })
        if (len < this.detect.minDistance) {
          this.detect.minDistance = len
          this.detect.target = el
          this.detect.pointer = { x: point[0], y: point[1] }
        }
      })
    },
    // 磁吸工具
    detectTool (event) {
      // 曲线节点处的磁吸检测
      function detectBezierCurvePoint (el) {
        const pointer = [{
          x: el.path[0][1],
          y: el.path[0][2]
        }]
        for (let i = 1, len = el.path.length; i < len; i++) {
          const c3 = {
            x: el.path[i][el.path[i].length - 2],
            y: el.path[i][el.path[i].length - 1]
          }
          pointer.push(c3)
        }
        pointer.forEach((e) => {
          const dis = this.distance(event.absolutePointer, e)
          if (dis < this.detect.minDistance) {
            this.detect.minDistance = dis
            this.detect.target = el
            this.detect.pointer = e
          }
        })
      }
      if (this.activeTool === 'Detect') {
        // 每一次鼠标移动先还原检测距离
        this.detect.minDistance = 10
        if (this.detect.target) this.detect.target.stroke = 'black'
        this.detect.target = null
        this.detect.pointer = null
        // 先检测端点如果距离符合磁吸范围，则吸附，并放弃检测线段距离
        this.allItems.forEach((el) => {
          if (el.id) {
            detectBezierCurvePoint.call(this, el)
          }
        })
        // 如果端点检测通过 放弃检测线段距离
        if (!this.detect.target) {
          // 检测线段中是否有符合磁吸范围的点
          this.allItems.forEach((el) => {
            // 过滤鼠标点处于元素的控制范围内的元素
            if (this.mouse.mouseCircle.intersectsWithObject(el)) {
              // 求鼠标点到线段的最短距离和线段上的点
              if (el.path[1][0] === 'L') {
                const k = (el.path[1][2] - el.path[0][2]) / (el.path[1][1] - el.path[0][1])
                const x3 = event.absolutePointer.x
                const y3 = event.absolutePointer.y
                const x = (k / (k * k + 1)) * (y3 - el.path[0][2] + k * el.path[0][1] + x3 / k)
                const y = y3 + x3 / k - x / k
                const len = Math.sqrt(Math.pow((x3 - x), 2) + Math.pow((y3 - y), 2))
                if (len < this.detect.minDistance) {
                  this.detect.minDistance = len
                  this.detect.target = el
                  this.detect.pointer = { x, y }
                }
              }
              if (el.path[1][0] === 'C') {
                this.detectBezierCurve(el, event)
              }
            }
          })
        }
        if (this.detect.target) {
          this.currentItem = {
            isChange: false,
            id: this.detect.target.id,
            target: this.detect.target,
            length: this.detect.target.length,
            path: this.detect.target.path,
            left: this.detect.target.left,
            top: this.detect.target.top
          }
        }
      }
    },
    // 磁吸工具V2.0
    detectTool2 (event) {
      // 曲线节点处的磁吸检测
      function detectBezierCurvePoint (el) {
        const pointer = [{
          x: el.path[0][1],
          y: el.path[0][2]
        }]
        for (let i = 1, len = el.path.length; i < len; i++) {
          if (el.path[i][0] === 'Z') continue
          const c3 = {
            x: el.path[i][el.path[i].length - 2],
            y: el.path[i][el.path[i].length - 1]
          }
          pointer.push(c3)
        }
        pointer.forEach((e) => {
          const dis = this.distance(event.absolutePointer, e)
          if (dis < this.detect.minDistance) {
            this.detect.minDistance = dis
            this.detect.target = el
            this.detect.pointer = e
          }
        })
      }
      function pointerToLine (pointer, line) {
        if (line.x1 === line.x2) {
          return {
            x: line.x1,
            y: pointer.y,
            len: Math.abs(pointer.x - line.x1)
          }
        }
        if (line.y1 === line.y2) {
          return {
            y: line.y1,
            x: pointer.x,
            len: Math.abs(pointer.y - line.y1)
          }
        }
        // pointer:点坐标 line线段两点坐标
        const k = (line.y2 - line.y1) / (line.x2 - line.x1)
        const x = (k / (k * k + 1)) * (pointer.y - line.y1 + k * line.x1 + pointer.x / k)
        const y = pointer.y + pointer.x / k - x / k
        const len = Math.sqrt(Math.pow((pointer.x - x), 2) + Math.pow((pointer.y - y), 2))
        if (line.x2 === 425.712) console.log('测试：：：', x, y, k, len)
        return { len, x, y }
      }
      function isPointInRect (p, r) {
        // p:pointer r:rect
        // 判断点是否在两点组成的rect之中
        if (((r.x1 - r.x2) < 5) && ((r.x2 - r.x1) > -5)) {
          r.x1 += (r.x1 - r.x2 > 0) ? 5 : -5
          r.x2 += (r.x2 - r.x1 > 0) ? 5 : -5
        }
        if (((r.y1 - r.y2) < 5) && ((r.y2 - r.y1) > -5)) {
          r.y1 += (r.y1 - r.y2 > 0) ? 5 : -5
          r.y2 += (r.y2 - r.y1 > 0) ? 5 : -5
        }
        return (((r.x1 <= p.x) && (p.x <= r.x2)) || ((r.x2 <= p.x) && (p.x <= r.x1))) && (((r.y1 <= p.y) && (p.y <= r.y2)) || ((r.y2 <= p.y) && (p.y <= r.y1)))
      }
      if (this.activeTool === 'Detect') {
        // 每一次鼠标移动先还原检测距离
        this.detect.minDistance = 10
        if (this.detect.target) this.detect.target.stroke = 'black'
        this.detect.target = null
        this.detect.pointer = null
        // 先检测端点如果距离符合磁吸范围，则吸附，并放弃检测线段距离
        this.allItems.forEach((el) => {
          if (el.id) {
            detectBezierCurvePoint.call(this, el)
          }
        })
        // 如果端点检测通过 放弃检测线段距离
        if (!this.detect.target) {
          // 检测线段中是否有符合磁吸范围的点
          this.allItems.forEach((el) => {
            // el.padding = 10
            // 过滤鼠标点处于元素的控制范围内的元素
            el.padding = 10
            if (this.mouse.mouseCircle.intersectsWithObject(el)) {
              // 求鼠标点到线段的最短距离和线段上的点
              if (el.type === 'Line') {
                const res = pointerToLine(event.absolutePointer, { x1: el.path[0][1], y1: el.path[0][2], x2: el.path[1][1], y2: el.path[1][2] })
                if (res.len < this.detect.minDistance) {
                  this.detect.minDistance = res.len
                  this.detect.target = el
                  this.detect.pointer = { x: res.x, y: res.y }
                }
              }
              if (el.type === 'Path') {
                const p = el.pointTemp
                const path = el.path
                let x, y, len
                for (let i = 0, leni = p.length; i < leni; i++) {
                  if (path[i][0] === 'L') {
                    const x1 = path[i - 1][path[i - 1].length - 2]
                    const y1 = path[i - 1][path[i - 1].length - 1]
                    const x2 = path[i][1]
                    const y2 = path[i][2]
                    if (isPointInRect(event.absolutePointer, { x1, y1, x2, y2 })) {
                      const res = pointerToLine(event.absolutePointer, { x1, y1, x2, y2 })
                      x = res.x
                      y = res.y
                      len = res.len
                      if (len < this.detect.minDistance) {
                        this.detect.minDistance = len
                        this.detect.target = el
                        this.detect.pointer = { x, y }
                      }
                    }
                  } else if (path[i][0] === 'C') {
                    p[i].forEach(point => {
                      x = point[0]
                      y = point[1]
                      len = this.distance(event.absolutePointer, { x, y })
                      if (len < this.detect.minDistance) {
                        this.detect.minDistance = len
                        this.detect.target = el
                        this.detect.pointer = { x, y }
                      }
                    })
                  } else {
                    continue
                  }
                }
              }
            }
            el.padding = 0
          })
        }
        if (this.detect.target) {
          this.currentItem = {
            isChange: false,
            id: this.detect.target.id,
            target: this.detect.target,
            length: this.detect.target.length,
            path: this.detect.target.path,
            left: this.detect.target.left,
            top: this.detect.target.top
          }
        }
      }
    },
    // 删除选中的项目
    deleteItem () {
      if (this.currentItem.target) {
        if (this.currentItem.target.controlCircle) {
          this.currentItem.target.controlCircle.forEach(e => e.removeSelf())
        }
        this.currentItem.target.removeSelf()
      }
      this.allItems = this.allItems.filter((item) => item !== this.currentItem.target)
      this.currentItem = {
        isChange: false,
        id: '',
        target: null,
        length: 0,
        path: null,
        left: 0,
        top: 0
      }
    },
    // 计算两点之间的距离
    distance (p1, p2) {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
    },
    // 获取线段元素的长度
    getLineLength (el) {
      return Math.sqrt(
        Math.pow((el.path[1][1] - el.path[0][1]), 2) + Math.pow((el.path[1][2] - el.path[0][2]), 2)
      ).toFixed(4)
    },
    // 鼠标移动事件
    mouseMove (event) {
      this.mouse.coord = event.absolutePointer
      if (this.mouse.isClick) this.mouse.isDragging = true
      if (this.activeTool === 'Hand') {
        return
      }
      this.mouseCircleMove(event)
      // 鼠标底部圆圈移动函数
      if (this.activeTool === 'Line') {
        if (this.currentItem.path) {
          this.priviewLine(event)
        }
      }
      if (this.activeTool === 'BezierCurve') {
        if (this.currentItem.path) {
          this.priviewBezierCurve(event)
        }
      }
      if (this.activeTool === 'Detect') {
        this.detectTool2(event)
      }
    },
    // 鼠标移出事件
    mouseOut (e) {
      if (!e.target) {
        if (this.mouse.mouseCircle) this.mouse.mouseCircle.removeSelf()
      }
    },
    // 鼠标按下事件
    mouseDown (e) {
      console.log(e.target)
      this.mouse.isClick = true
      // 处于抓取工具时
      if (this.activeTool === 'Hand') {
        if (e.target === this.currentItem.target) return
        if (e.target?.controlElement === this.currentItem.target) return
        if (this.currentItem.target?.controlCircle) {
          this.currentItem.target.controlCircle.forEach(e => e.removeSelf())
        }
        if (!e.target) {
          this.currentItem.target.isChange = false
          this.currentItem = {
            isChange: false,
            id: '',
            target: null,
            length: 0,
            path: null,
            left: 0,
            top: 0
          }
        } else {
          if (this.currentItem.target !== e.target && this.currentItem.target !== null) {
            this.currentItem.target.isChange = false
          }
        }
      }

      // 处于Line线段工具时
      if (this.activeTool === 'Line') {
        // todo 第一点的时候
        if (!this.currentItem.path) {
          this.currentItem.path = [['M', e.absolutePointer.x, e.absolutePointer.y]]
        } else {
          this.currentItem.path.push(['L', e.absolutePointer.x, e.absolutePointer.y])
          const newLine = this.createPath(this.currentItem.path)
          this.allItems.push(newLine)
          console.log('创建线段:', newLine.id, newLine)
          this.currentItem.target.removeSelf()
          this.currentItem.target = null
          this.currentItem.path = null
        }
      }
      // 处于BezierCurve贝塞斯曲线工具时
      if (this.activeTool === 'BezierCurve') {
        if (!this.currentItem.path) {
          this.currentItem.path = [['M', e.absolutePointer.x, e.absolutePointer.y], ['C', e.absolutePointer.x, e.absolutePointer.y, e.absolutePointer.x, e.absolutePointer.y, e.absolutePointer.x, e.absolutePointer.y]]
        } else {
          const p = this.currentItem.path
          const last = p.length - 1
          const path = ['C', 2 * p[last][5] - p[last][3], 2 * p[last][6] - p[last][4], e.absolutePointer.x, e.absolutePointer.y, e.absolutePointer.x, e.absolutePointer.y]
          this.currentItem.path.push(path)
          this.currentItem.target.removeSelf()
          this.currentItem.target = this.createPath(this.currentItem.path, 'blue')
        }
      }
    },
    // 鼠标抬起事件
    mouseUp (e) {
      this.mouse.isClick = false
      this.mouse.isDragging = false
    },
    // 鼠标下的圆移动
    mouseCircleMove (e) {
      if (this.mouse.mouseCircle) this.mouse.mouseCircle.removeSelf()
      const circle = this.mouse.mouseCircle = new fabric.Circle({
        left: e.absolutePointer.x,
        top: e.absolutePointer.y,
        perPixelTargetFind: true,
        hoverCursor: 'default',
        originX: 'center',
        originY: 'center',
        objectCaching: false,
        radius: 6,
        fill: '#fff',
        stroke: 'blue',
        strokeWidth: 1,
        selectable: false
      })
      this.mouse.mouseCircle = circle
      if (this.detect.pointer) {
        circle.set({
          left: parseInt(this.detect.pointer.x),
          top: parseInt(this.detect.pointer.y)
        })
        this.detect.target.stroke = 'blue'
      }
      this.mouse.coord = { x: circle.left, y: circle.top }
      circle.addSelf()
    },
    // 对象的双击事件
    objDbclick (event) {
      fabric.Object.prototype.hasBorders = false
      if (event.target.isChange === true) return
      event.target.isChange = true
      // if (event.target.type === 'Line') {
      //   this.createLineControl(event)
      // }
      // if (event.target.type === 'BezierCurve') {
      //   this.createBezierCurveControl(event)
      // }
      this.updatePath(event)
    },
    // 对象的移动中事件
    objMoving (event) {
      if (event.target.controlCircle) {
        event.target.controlCircle.forEach(e => e.removeSelf())
      }
    },
    // 对象移动后事件
    objMoved (event) {
      this.updatePath(event)
    },
    // 对象点击事件
    objMouseDown (e) {
      fabric.Object.prototype.hasBorders = true
      this.currentItem = {
        isChange: e.target.isChange,
        id: e.target.id,
        target: e.target,
        length: e.target.length,
        path: e.target.path,
        left: e.target.left,
        top: e.target.top
      }
    },
    // 创建线段时预览线段
    priviewLine (event) {
      const path = [this.currentItem.path[0], ['L', event.absolutePointer.x, event.absolutePointer.y]]
      if (this.currentItem.target) {
        this.currentItem.target.removeSelf()
      }
      this.currentItem.target = this.createPath(path, 'blue')
    },
    // 修改Bezier曲线时预览
    priviewBezierChange (event) {
      const el = event.target
      const deltaX = event.pointer.x - el.pathXY[el.pathX]
      const deltaY = event.pointer.y - el.pathXY[el.pathY]
      if (this.isSmoothBezierCurve) {
        // 预览曲线
        el.pathXY[el.pathX] = event.pointer.x
        el.pathXY[el.pathY] = event.pointer.y
        const el2 = el.controlLine.othersContral[0]
        const el3 = el.controlLine.othersContral[1]
        if (el.controlLine.center) {
          el.controlLine.line.forEach(l => {
            l.set({
              x1: l.x1 + deltaX,
              y1: l.y1 + deltaY,
              x2: l.x2 + deltaX,
              y2: l.y2 + deltaY
            })
            l.setCoords()
          })
          el2.pathXY[el2.pathX] += deltaX
          el2.pathXY[el2.pathY] += deltaY
          if (el3) {
            el3.pathXY[el3.pathX] += deltaX
            el3.pathXY[el3.pathY] += deltaY
          }
          el.controlLine.othersContral.forEach(c => {
            c.set({
              left: c.pathXY[c.pathX],
              top: c.pathXY[c.pathY]
            })
          })
        } else {
          el.controlLine.line[0].set({
            x1: event.pointer.x,
            y1: event.pointer.y
          })
          el.controlLine.line[0].setCoords()
          if (el3) {
            el3.pathXY[el3.pathX] -= deltaX
            el3.pathXY[el3.pathY] -= deltaY
            el3.set({
              left: el3.pathXY[el3.pathX],
              top: el3.pathXY[el3.pathY]
            })
            el3.controlLine.line[0].set({
              x1: el3.pathXY[el3.pathX],
              y1: el3.pathXY[el3.pathY]
            })
            el3.controlLine.line[0].setCoords()
          }
        }
      } else {
        el.pathXY[el.pathX] = event.pointer.x
        el.pathXY[el.pathY] = event.pointer.y
        if (el.controlLine.center) {
          el.controlLine.line.forEach((e) => {
            e.set({
              x1: e.x1,
              y1: e.y1,
              x2: event.pointer.x,
              y2: event.pointer.y
            })
            e.setCoords()
          })
        } else {
          el.controlLine.line[0].set({
            x1: event.pointer.x,
            y1: event.pointer.y
          })
          el.controlLine.line[0].setCoords()
        }
      }
    },
    // 创建曲线时预览
    priviewBezierCurve (event) {
      if (this.currentItem.target) this.currentItem.target.removeSelf()
      const p = this.currentItem.path
      const e = event.absolutePointer
      if (this.mouse.isDragging) {
        switch (p[p.length - 2][0]) {
          case 'M':
            break
          case 'C':
            p[p.length - 1][1] = e.x
            p[p.length - 1][2] = e.y
            p[p.length - 2][3] = 2 * p[p.length - 2][5] - e.x
            p[p.length - 2][4] = 2 * p[p.length - 2][6] - e.y
            break
        }
      }
      p[p.length - 1][3] = e.x
      p[p.length - 1][4] = e.y
      p[p.length - 1][5] = e.x
      p[p.length - 1][6] = e.y
      // if (this.isSmoothBezierCurve) {
      //   p[p.length - 1][1] = 2 * p[p.length - 2][5] - p[p.length - 2][3]
      //   p[p.length - 1][2] = 2 * p[p.length - 2][6] - p[p.length - 2][4]
      // }
      this.currentItem.target = this.createPath(this.currentItem.path, 'blue')
    },
    // 路径生成点缓存
    pathPointTemp (el) {
      const p = el.path
      const creatTemp = []
      for (let i = 0, len = p.length; i < len; i++) {
        if (p[i][0] === 'C') {
          const temp = []
          const x0 = p[i - 1][p[i - 1].length - 2]
          const y0 = p[i - 1][p[i - 1].length - 1]
          const x1 = p[i][1]
          const y1 = p[i][2]
          const x2 = p[i][3]
          const y2 = p[i][4]
          const x3 = p[i][5]
          const y3 = p[i][6]
          for (let t = 0.01; t < 1; t += 0.01) {
            const x = Math.pow((1 - t), 3) * x0 + 3 * t * Math.pow((1 - t), 2) * x1 + 3 * Math.pow(t, 2) * (1 - t) * x2 + Math.pow(t, 3) * x3
            const y = Math.pow((1 - t), 3) * y0 + 3 * t * Math.pow((1 - t), 2) * y1 + 3 * Math.pow(t, 2) * (1 - t) * y2 + Math.pow(t, 3) * y3
            temp.push([x.toFixed(3), y.toFixed(3)])
          }
          creatTemp.push(temp)
        } else {
          creatTemp.push(p[i])
        }
      }
      el.pointTemp = creatTemp
    },
    // 统一转化path为绝对定位
    relativeToAbsolute (el) {
      const p = el.path
      const left = 0
      const top = 0
      p[0][1] -= left
      p[0][2] -= top
      for (let i = 1; i < p.length; i++) {
        if (/[a-zHSV]/.test(p[i][0])) {
          const lastX = p[i - 1][p[i - 1].length - 2]
          const lastY = p[i - 1][p[i - 1].length - 1]
          switch (p[i][0]) {
            case 'V':
              p[i][0] = 'L'
              p[i][1] = lastX
              p[i][2] = p[i][2] - top
              break
            case 'v':
              p[i][0] = 'L'
              p[i][1] = lastX
              p[i][2] = lastY + p[i][2]
              break
            case 'H':
              p[i][0] = 'L'
              p[i][1] = p[i][1] - left
              p[i][2] = lastY
              break
            case 'h':
              p[i][0] = 'L'
              p[i][1] = lastX + p[i][1]
              p[i][2] = lastY
              break
            case 's':
              p[i][0] = 'C'
              p[i][5] = p[i][3] + lastX
              p[i][6] = p[i][4] + lastY
              p[i][3] = p[i][1] + lastX
              p[i][4] = p[i][2] + lastY
              if (p[i - 1][0] === 'C') {
                p[i][1] = 2 * lastX - p[i - 1][3]
                p[i][2] = 2 * lastY - p[i - 1][4]
              } else {
                p[i][1] = lastX
                p[i][2] = lastY
              }
              break
            case 'S':
              p[i][0] = 'C'
              p[i][5] = p[i][3] - left
              p[i][6] = p[i][4] - top
              p[i][3] = p[i][1] - left
              p[i][4] = p[i][2] - top
              if (p[i - 1][0] === 'C') {
                p[i][1] = 2 * lastX - p[i - 1][3]
                p[i][2] = 2 * lastY - p[i - 1][4]
              } else {
                p[i][1] = lastX
                p[i][2] = lastY
              }
              break
            default:
              p[i][0] = p[i][0].toUpperCase()
              for (let j = 1; j < p[i].length; j += 2) {
                p[i][j] += lastX
                p[i][j + 1] += lastY
              }
              break
          }
        } else {
          for (let j = 1, len = p[i].length; j < len; j += 2) {
            p[i][j] -= left
            p[i][j + 1] -= top
          }
        }
      }
    },
    // 移动对象后 更新其Path路径以及视图
    updatePath (event) {
      let t
      if (event.target.type === 'controlCircle') {
        t = event.target.controlElement
      } else {
        t = event.target
        for (let i = 0, leni = t.path.length; i < leni; i++) {
          for (let j = 1, lenj = t.path[i].length; j < lenj; j += 2) {
            t.path[i][j] = t.path[i][j] + (t.left - this.currentItem.left)
          }
          for (let j = 2, lenj = t.path[i].length; j < lenj; j += 2) {
            t.path[i][j] = t.path[i][j] + (t.top - this.currentItem.top)
          }
        }
      }
      const newPath = this.createPath(t.path)
      newPath.id = t.id
      newPath.isChange = t.isChange
      if (event.target.type === 'controlCircle') {
        t.controlCircle.forEach(e => e.removeSelf())
      }
      this.currentItem = {
        isChange: newPath.isChange,
        id: newPath.id,
        target: newPath,
        length: newPath.length,
        path: newPath.path,
        left: newPath.left,
        top: newPath.top
      }
      this.allItems = this.allItems.filter((item) => item !== t)
      this.allItems.push(newPath)
      this.canvas.remove(t)
      if (t.isChange) {
        if (t.type === 'Line') {
          this.createLineControl({ target: newPath })
        } else {
          this.createBezierCurveControl({ target: newPath })
        }
      }
      return newPath
    }
  },
  mounted () {
    // 初始化
    this.initialize()
  }
}
</script>

<style>
canvas{
  border:1px solid black
}
.active{
  background-color: hsl(200,50%,50%);
}
#nav{
  display: flex;
}
#mouse{
  float: left;
  position: relative;
  border: 1px solid hsl(200,50%,50%);
  border-radius: 5px;
  width: 10px;
  height: 10px;
}
</style>
