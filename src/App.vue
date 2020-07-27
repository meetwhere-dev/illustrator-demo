<template>
  <div id="app">
    <div id="nav">
     <!-- 工具栏按钮  -->
      <button
      :key="index"
      v-for="(item, index) of tools"
      :class="activeTool === item ? 'active': ''"
      @click="activeTool = item; applicationClick(item.toLowerCase())"
      >{{item}}</button>
    </div>
    <!-- 画布 -->
    <canvas id="c" width="800px" height="500px"></canvas>
    <div id="mouse_coord">坐标 X:{{mouse.coord.x.toFixed(2)}}|| Y:{{mouse.coord.y.toFixed(2)}}</div>
  </div>
</template>
<script>
import { fabric } from 'fabric'

export default {
  data () {
    return {
      // 工具栏
      tools: ['Hand', 'BezierCurve', 'Line', 'Detect', 'Delete'],
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
        isClickIng: false,
        newLine: null
      }
    }
  },
  methods: {
    // 对象内容作为方法名调用
    applicationClick (methodsName) {
      this.$options.methods[methodsName].apply(this)
      // 初始化
      this.createLine = {
        isClick: false,
        isClickIng: false,
        newLine: null
      }
    },
    hand () {
      console.log('hand')
    },
    beziercurve () {
      console.log('bezierCurve')
    },
    line () {
      console.log('line')
      console.log(this.canvas)
    },
    detect () {
      console.log('detect')
    },
    delete () {
      console.log('delete')
    }
  },
  mounted () {
    console.log(this.canvas)
    function onObjectMoving (e) {
      // const t = e.target
      // console.log(t.left)
    }
    const canvas = new fabric.Canvas('c')
    this.canvas = canvas
    this.canvas.on({
      'object:moving': onObjectMoving,
      // 鼠标移动事件
      'mouse:move': (e) => {
        this.mouse.coord = e.absolutePointer
        circle.set({
          left: e.absolutePointer.x - 10,
          top: e.absolutePointer.y - 10
        })
        // 画线段工具
        if (this.activeTool === 'Line') {
          if (this.createLine.isClick) {
            this.createLine.newLine.set({
              x2: e.absolutePointer.x,
              y2: e.absolutePointer.y
            })
          }
        }
        // 画曲线工具
        if (this.activeTool === 'BezierCurve') {
          if (this.createLine.isClick) {
            // 预览BezierCurve双曲线的后控制点和终点
            const p = this.createLine.newLine.path
            p[p.length - 1][3] = e.absolutePointer.x
            p[p.length - 1][4] = e.absolutePointer.y
            p[p.length - 1][5] = e.absolutePointer.x
            p[p.length - 1][6] = e.absolutePointer.y
          }
          if (this.createLine.isClickIng) {
            const p = this.createLine.newLine.path
            console.log(p)
            const pl = p.length - 2
            // 设置下一条BezierCurve双曲线的前控制点和 当前曲线的后控制点
            p[pl][3] = 2 * p[pl][5] - e.absolutePointer.x
            p[pl][4] = 2 * p[pl][6] - e.absolutePointer.y
            p[pl + 1][1] = e.absolutePointer.x
            p[pl + 1][2] = e.absolutePointer.y
          }
        }

        this.canvas.renderAll()
      },
      // 鼠标按下事件
      'mouse:down': (e) => {
        this.mouse.status.name = 'mouseDown'
        this.mouse.status.date = new Date()
        this.createLine.isClickIng = true
        // 处于Line线段工具时
        if (this.activeTool === 'Line') {
          if (!this.createLine.isClick) {
            const newLine = this.createLine.newLine = new fabric.Line([e.absolutePointer.x, e.absolutePointer.y, e.absolutePointer.x, e.absolutePointer.y], {
              left: e.absolutePointer.x,
              top: e.absolutePointer.y,
              stroke: 'red',
              selectable: false
            })
            this.canvas.add(newLine)
          } else {
            this.createLine.newLine.set({
              stroke: 'black'
            })
          }
          this.createLine.isClick = !this.createLine.isClick
        }
        // 处于BezierCurve贝塞斯曲线工具时
        if (this.activeTool === 'BezierCurve') {
          if (!this.createLine.isClick) {
            const newLine = this.createLine.newLine = new fabric.Path(
              `M ${e.absolutePointer.x} ${e.absolutePointer.y} C ${e.absolutePointer.x}, ${e.absolutePointer.y}, ${e.absolutePointer.x}, ${e.absolutePointer.y}, ${e.absolutePointer.x}, ${e.absolutePointer.y}`,
              {
                stroke: 'red',
                selectable: false,
                fill: '',
                strokeWidth: 2,
                // 坑 objectCaching  估计是fabric为了提高性能，设置的缓存选项，缓存后就不会实时更新path对象
                objectCaching: false
              })
            console.log(this.createLine.newLine)
            this.canvas.add(newLine)
            this.createLine.isClick = !this.createLine.isClick
          } else {
            this.createLine.newLine.path.push(['C', e.absolutePointer.x, e.absolutePointer.y, e.absolutePointer.x, e.absolutePointer.y, e.absolutePointer.x, e.absolutePointer.y])
          }
        }
      },
      // 鼠标抬起事件
      'mouse:up': (e) => {
        this.createLine.isClickIng = false
        const now = new Date()
        const time = now - this.mouse.status.date
        console.log(time)
        if (this.activeTool === 'BezierCurve') {
          if (this.createLine.isClick) {
            console.log(this.createLine.newLine)
          }
        }
      }
    })
    // 初始化
    const circle = this.mouseCircle = new fabric.Circle({
      left: -20,
      top: 0,
      radius: 10,
      fill: '#fff',
      stroke: '#666',
      strokeWidth: 1
    })
    canvas.add(circle)
    console.log(canvas)
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
</style>
