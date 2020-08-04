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

export default {
  data () {
    return {
      // 工具栏
      tools: ['Hand', 'BezierCurve', 'Line', 'Detect'],
      // 选中的工具
      activeTool: 'Hand',
      // 画布
      canvas: null,
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
      const canvas = this.canvas = new fabric.Canvas('c')
      canvas.selection = false
      // 设置元素对象默认值 selectable (可被选择)
      fabric.Object.prototype.selectable = false
      // hasControls (元素对象拥有控制框架)
      fabric.Object.prototype.hasControls = false
      // hasBorders (元素对象拥有控制框线)
      fabric.Object.prototype.hasBorders = false
      fabric.Object.prototype.hoverCursor = 'default'
      fabric.Object.prototype.originX = 'center'
      fabric.Object.prototype.originY = 'center'
      fabric.Object.prototype.removeSelf = function () {
        canvas.remove(this)
      }
      fabric.Object.prototype.addSelf = function () {
        canvas.add(this)
      }
      // this.allItems = this.allItems.filter((item) => item !== this.currentItem.target)
      this.canvas.on({
      // 鼠标移动事件
        'mouse:move': this.mouseMove,
        'mouse:out': this.mouseOut,
        // 鼠标按下事件
        'mouse:down': this.mouseDown,
        // 鼠标抬起事件
        'mouse:up': this.mouseUp

      })
      // 获取上层canvas对象
      const upperCanvas = document.getElementsByClassName('upper-canvas')
      // 鼠标右键事件，并添加终止画笔工具事件
      upperCanvas[0].addEventListener('contextmenu', (e) => {
        console.log('终止画笔工具')
        this.cutNewLine()
        e.preventDefault()
        return false
      })
    },
    // 创建Bezier曲线的控制圆
    bezierControlCircle (i, x, y, path) {
      const c = this.createCircle(path[i][x], path[i][y])
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
        type: 'BezierCurve',
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
        newLine.pointTemp = this.createTemp(newLine.path)
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

      let tempCircle = null
      for (let i = 1, len = path.length; i < len; i++) {
        let line1
        if (i === 1) {
          // 第一个点
          tempCircle = this.bezierControlCircle(0, 1, 2, path)
          controllers.push(tempCircle)
          tempCircle.controlLine = { center: true, line: [] }
          line1 = this.bezierControlLine([path[1][1], path[1][2], path[0][1], path[0][2]])
        } else {
          line1 = this.bezierControlLine([path[i][1], path[i][2], path[i - 1][5], path[i - 1][6]])
        }
        tempCircle.controlLine.line.push(line1)
        const line2 = this.bezierControlLine([path[i][3], path[i][4], path[i][5], path[i][6]])

        const circle2 = this.bezierControlCircle(i, 1, 2, path)
        circle2.controlLine = { center: false, line: [line1] }

        tempCircle = this.bezierControlCircle(i, 5, 6, path)
        tempCircle.controlLine = { center: true, line: [line2] }

        const circle3 = this.bezierControlCircle(i, 3, 4, path)
        circle3.controlLine = { center: false, line: [line2] }
        controllers.push(line1, line2, circle2, circle3, tempCircle)
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
        const len = this.distance(event.pointer, { x: point[0], y: point[1] })
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
          const dis = this.distance(event.pointer, e)
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
                const x3 = event.pointer.x
                const y3 = event.pointer.y
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
        // // 改变鼠标的磁吸位置
        // if (this.detect.target) {
        //   if (this.detect.target) this.detect.target.stroke = 'blue'
        //   this.getHandInfo(this.detect.target)
        //   this.mouseCircle.set({
        //     left: this.detect.pointer.x,
        //     top: this.detect.pointer.y
        //   })
        // }
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
      if (this.mouse.isClick) this.mouse.isDragging = true
      if (this.activeTool === 'Hand') {
        return
      }
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
        this.detectTool(event)
      }
      this.mouseCircleMove(event)
      // 鼠标底部圆圈移动函数
    },
    // 鼠标移出事件
    mouseOut (e) {
      if (!e.target) {
        if (this.mouse.mouseCircle) this.mouse.mouseCircle.removeSelf()
      }
    },
    // 鼠标按下事件
    mouseDown (e) {
      console.log(this.allItems)
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
          this.currentItem.path = [['M', e.pointer.x, e.pointer.y]]
        } else {
          this.currentItem.path.push(['L', e.pointer.x, e.pointer.y])
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
          this.currentItem.path = [['M', e.pointer.x, e.pointer.y], ['C', e.pointer.x, e.pointer.y, e.pointer.x, e.pointer.y, e.pointer.x, e.pointer.y]]
        } else {
          const p = this.currentItem.path
          const last = p.length - 1
          const path = ['C', 2 * p[last][5] - p[last][3], 2 * p[last][6] - p[last][4], e.pointer.x, e.pointer.y, e.pointer.x, e.pointer.y]
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
        left: e.pointer.x,
        top: e.pointer.y,
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
      circle.addSelf()
    },
    // 对象的双击事件
    objDbclick (event) {
      fabric.Object.prototype.hasBorders = false
      if (event.target.isChange === true) return
      event.target.isChange = true
      if (event.target.type === 'Line') {
        this.createLineControl(event)
      }
      if (event.target.type === 'BezierCurve') {
        this.createBezierCurveControl(event)
      }
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
      const path = [this.currentItem.path[0], ['L', event.pointer.x, event.pointer.y]]
      if (this.currentItem.target) {
        this.currentItem.target.removeSelf()
      }
      this.currentItem.target = this.createPath(path, 'blue')
    },
    // 修改Bezier曲线时预览
    priviewBezierChange (event) {
      event.target.pathXY[event.target.pathX] = event.pointer.x
      event.target.pathXY[event.target.pathY] = event.pointer.y
      if (event.target.controlLine.center) {
        event.target.controlLine.line.forEach((e) => {
          e.set({
            x1: e.x1,
            y1: e.y1,
            x2: event.pointer.x,
            y2: event.pointer.y
          })
          e.setCoords()
        })
      } else {
        event.target.controlLine.line.forEach((e) => {
          e.set({
            x1: event.pointer.x,
            y1: event.pointer.y
          })
          e.setCoords()
        })
      }
    },
    // 创建曲线时预览
    priviewBezierCurve (event) {
      if (this.currentItem.target) this.currentItem.target.removeSelf()
      const p = this.currentItem.path
      const e = event.pointer
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

      this.currentItem.target = this.createPath(this.currentItem.path, 'blue')
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
