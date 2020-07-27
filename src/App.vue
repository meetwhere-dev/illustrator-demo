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
      canvas: 'asdasdasd',
      mouseCircle: null,
      items: [],
      createLine: {
        // 第一次点击flag 确定newLine的第一点
        isClick: false,
        newLine: null
      }
    }
  },
  methods: {
    // 对象内容作为方法名调用
    applicationClick (methodsName) {
      this.$options.methods[methodsName].apply(this)
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
    canvas.on({
      'object:moving': onObjectMoving,
      'mouse:move': (e) => {
        circle.set({
          left: e.absolutePointer.x - 10,
          top: e.absolutePointer.y - 10
        })
        if (this.createLine.isClick) {
          this.createLine.newLine.set({
            x2: e.absolutePointer.x,
            y2: e.absolutePointer.y
          })
        }
        canvas.renderAll(circle)
      },
      'mouse:down': (e) => {
        if (this.activeTool === 'Line') {
          if (!this.createLine.isClick) {
            const newLine = this.createLine.newLine = new fabric.Line([e.absolutePointer.x, e.absolutePointer.y, e.absolutePointer.x, e.absolutePointer.y], {
              left: e.absolutePointer.x,
              top: e.absolutePointer.y,
              stroke: 'red',
              selectable: false
            })
            this.canvas.add(newLine)
          }
          this.createLine.isClick = !this.createLine.isClick
        }
      }
    })
    const line = new fabric.Path('M 100 100 Q 200, 200, 300, 100', {
      fill: '#fff',
      stroke: 'black',
      strokeWidth: 2
    })
    const circle = this.mouseCircle = new fabric.Circle({
      left: -20,
      top: 0,
      radius: 10,
      fill: '#fff',
      stroke: '#666',
      strokeWidth: 1
    })
    canvas.add(line)
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
