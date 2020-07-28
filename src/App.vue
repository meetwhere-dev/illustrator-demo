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
      <div v-show="handTool.length">名称：{{handTool.name}} 长度：{{handTool.length}}</div>
    </div>
    <!-- 画布 -->
    <div  >
      <canvas id="c" width="800px" height="500px" tabindex="0" ></canvas>
    </div>
    <div id="mouse_coord">坐标 X:{{mouse.coord.x.toFixed(2)}}|| Y:{{mouse.coord.y.toFixed(2)}}</div>
  </div>
</template>
<script>
import { fabric } from 'fabric'

export default {
  data () {
    return {
      // 工具栏
      tools: ['Hand', 'BezierCurve', 'Line', 'Detect'],
      // 选中的工具
      activeTool: 'Hand',
      // 画布
      canvas: null,
      mouseCircle: null,
      mouse: { coord: { x: 0, y: 0 }, status: { name: '', date: '' } },
      items: [],
      createLine: {
        // 第一次点击flag 确定newLine的第一点
        isClick: false,
        isClicking: false,
        newLine: null
      },
      // 抓取工具缓存
      handTool: {
        name: '',
        length: 0,
        target: null
      }
    }
  },
  methods: {
    // 对象内容作为方法名调用
    changeTool (item) {
      if (this.activeTool === item) {
        console.log('=====')
        return true
      }
      // this.$options.methods[methodsName].apply(this)
      // 切换工具时 初始化
      if (item === 'BezierCurve' || item === 'Line') {
        console.log('切换至不可选模式')
        this.canvas.forEachObject(function (o) { o.selectable = false })
        this.createLine.isClick = false
        this.createLine.isClicking = false
      } else {
        console.log('切换至可选模式')
        this.handTool.length = 0
        this.canvas.forEachObject(function (o) { o.selectable = o.hasBorders = true })
      }

      this.activeTool = item
    },
    deleteItem (target = this.handTool.target) {
      console.log('Delete:', this.handTool.name)
      this.canvas.remove(target)
    },
    pathOver () {
      if (this.createLine.isClick) {
        // 去除最后一条预览线
        this.createLine.newLine.path.pop()
        let pathStr = ''
        this.createLine.newLine.path.forEach(function (item) {
          pathStr += item.join(' ')
        })
        const newPath = new fabric.Path(
          pathStr,
          {
            stroke: 'red',
            hasControls: false,
            fill: '',
            strokeWidth: 2
          })
        newPath.name = +new Date()
        console.log(newPath, this.createLine.newLine)
        this.canvas.add(newPath)
        this.canvas.remove(this.createLine.newLine)
      }
    },
    mouseCircleMove (e) {
      this.mouse.coord = e.absolutePointer
      this.mouseCircle.set({
        left: e.absolutePointer.x,
        top: e.absolutePointer.y
      })
    },
    createBezierCurveTool (e) {
      if (this.activeTool === 'BezierCurve') {
        if (this.createLine.isClick) {
          // 预览BezierCurve双曲线的后控制点和终点
          const p = this.createLine.newLine.path
          p[p.length - 1][3] = e.absolutePointer.x
          p[p.length - 1][4] = e.absolutePointer.y
          p[p.length - 1][5] = e.absolutePointer.x
          p[p.length - 1][6] = e.absolutePointer.y
        }
        if (this.createLine.isClicking) {
          const p = this.createLine.newLine.path
          const pl = p.length - 2
          // 设置下一条BezierCurve双曲线的前控制点和 当前曲线的后控制点
          if (pl > 0) {
            p[pl][3] = 2 * p[pl][5] - e.absolutePointer.x
            p[pl][4] = 2 * p[pl][6] - e.absolutePointer.y
          }
          p[pl + 1][1] = e.absolutePointer.x
          p[pl + 1][2] = e.absolutePointer.y
        }
      }
    },
    createLineTool (e) {
      if (this.activeTool === 'Line') {
        if (this.createLine.isClick) {
          this.createLine.newLine.set({
            x2: e.absolutePointer.x,
            y2: e.absolutePointer.y
          })
        }
      }
    }
  },
  mounted () {
    // 鼠标移动事件
    function mouseMove (e) {
      // 鼠标底部圆圈移动函数
      this.mouseCircleMove(e)

      // 画线段工具
      this.createLineTool(e)
      // 画曲线工具
      this.createBezierCurveTool(e)

      this.canvas.renderAll()
    }

    // 鼠标点击事件
    function mouseDown (e) {
      this.mouse.status.name = 'mouseDown'
      this.mouse.status.date = new Date()
      this.createLine.isClicking = true

      // 处于抓取工具时
      if (this.activeTool === 'Hand') {
        const t = e.target
        if (t) {
          const length = Math.sqrt(Math.pow(Math.abs(t.x2 - t.x1), 2) + Math.pow(Math.abs(t.y2 - t.y1), 2)).toFixed(2)
          this.handTool.name = e.target.name
          this.handTool.length = length
          this.handTool.target = e.target
        }
      }

      // 处于Line线段工具时
      if (this.activeTool === 'Line') {
        if (!this.createLine.isClick) {
          const newLine = this.createLine.newLine = new fabric.Line([e.absolutePointer.x, e.absolutePointer.y, e.absolutePointer.x, e.absolutePointer.y], {
            selectable: false,
            hasControls: false,
            hasBorders: false,
            stroke: 'red',
            strokeWidth: 2
          })
          newLine.name = +new Date()
          console.log('创建线段:', newLine.name, newLine)
          this.canvas.add(newLine)
        } else {
          this.createLine.newLine.set({
            stroke: 'black'
          })
          this.createLine.newLine.setCoords()
        }
        this.createLine.isClick = !this.createLine.isClick
      }
      // 处于BezierCurve贝塞斯曲线工具时
      if (this.activeTool === 'BezierCurve') {
        if (!this.createLine.isClick) {
          const newLine = this.createLine.newLine = new fabric.Path(
              `M ${e.absolutePointer.x} ${e.absolutePointer.y} C ${e.absolutePointer.x}, ${e.absolutePointer.y}, ${e.absolutePointer.x}, ${e.absolutePointer.y}, ${e.absolutePointer.x}, ${e.absolutePointer.y}`,
              {
                selectable: false,
                hasControls: false,
                hasBorders: false,
                stroke: 'red',
                fill: '',
                strokeWidth: 2,
                // 坑 objectCaching  估计是fabric为了提高性能，设置的缓存选项，缓存后就不会实时更新path对象
                objectCaching: false
              })
          this.canvas.add(newLine)
          this.createLine.isClick = !this.createLine.isClick
        } else {
          this.createLine.newLine.path.push(['C', e.absolutePointer.x, e.absolutePointer.y, e.absolutePointer.x, e.absolutePointer.y, e.absolutePointer.x, e.absolutePointer.y])
        }
      }
    }
    // 鼠标抬起事件
    function mouseUp (e) {
      this.createLine.isClicking = false
      // const now = new Date()
      // const time = now - this.mouse.status.date
      // console.log(time)
      if (this.activeTool === 'BezierCurve') {
        if (this.createLine.isClick) {
          console.log(this.createLine.newLine)
        }
      }
    }
    function mouseOver (e) {
      this.mouseCircle.set({
        opacity: 1
      })
    }
    function mouseOut (e) {
      this.mouseCircle.set({
        opacity: 0
      })
      this.canvas.renderAll()
    }
    // 初始化
    const canvas = this.canvas = new fabric.Canvas('c')
    canvas.selection = false
    // 设置元素对象默认值 selectable (可被选择)
    fabric.Object.prototype.selectable = false
    // hasControls (元素对象拥有控制框架)
    fabric.Object.prototype.hasControls = false
    // hasBorders (元素对象拥有控制框线)
    fabric.Object.prototype.hasBorders = false

    // 给画布设置监听事件
    this.canvas.on({
      // 鼠标移动事件
      'mouse:move': mouseMove.bind(this),
      // 鼠标按下事件
      'mouse:down': mouseDown.bind(this),
      // 鼠标抬起事件
      'mouse:up': mouseUp.bind(this),
      'mouse:over': mouseOver.bind(this),
      'mouse:out': mouseOut.bind(this)
    })

    // 鼠标箭头下的O
    const circle = this.mouseCircle = new fabric.Circle({
      originX: 'center',
      originY: 'center',
      radius: 8,
      fill: '#fff',
      stroke: '#666',
      strokeWidth: 1,
      selectable: false
    })
    canvas.add(circle)

    // 获取上层canvas对象
    const upperCanvas = document.getElementsByClassName('upper-canvas')

    // 捕获右键事件，并添加终止画笔工具事件
    upperCanvas[0].addEventListener('contextmenu', (e) => {
      console.log('终止画笔工具')
      if (this.activeTool === 'BezierCurve') {
        this.pathOver.apply(this)
      }
      if (this.activeTool === 'Line') {
        this.deleteItem(this.createLine.newLine)
      }
      this.createLine.isClick = false
      this.createLine.isClicking = false
      e.preventDefault()
      return false
    })
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
</style>
