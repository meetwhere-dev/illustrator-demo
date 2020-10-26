# illustrator-Demo

## 初始化

### 挂载画布（画布的初始设置）

```javascript
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
    canvas.add(circle)
}
```

### 挂载起始元素（鼠标图标下的圆圈）

```javascript
const circle = this.mouseCircle = new fabric.Circle({
        perPixelTargetFind: true,
        hoverCursor: 'default',
        originX: 'center',
        originY: 'center',
        objectCaching: false,
        radius: 8,
        fill: '#fff',
        stroke: '#666',
        strokeWidth: 1,
        selectable: false
      })
      canvas.add(circle)
```



### 画布的监听事件

```javascript
this.canvas.on({
      // 鼠标移动事件
      'mouse:move': mouseMove.bind(this),
      // 鼠标按下事件
      'mouse:down': mouseDown.bind(this),
      // 鼠标抬起事件
      'mouse:up': mouseUp.bind(this),
      // 鼠标双击事件
      'mouse:dblclick': mouseDblclick.bind(this),
      // 元素移动后事件
      'object:moved': objectMoved.bind(this),
      // 元素移动中事件
      'object:moving': objectMoving.bind(this),
      // 下列控制鼠标下圆形图标的 鼠标出入元素事件
      'mouse:over': mouseOver.bind(this),
      'mouse:out': mouseOut.bind(this)
    })

const upperCanvas = document.getElementsByClassName('upper-canvas')
    // 鼠标右键事件，并添加终止画笔工具事件
    upperCanvas[0].addEventListener('contextmenu', (e) => {
      console.log('终止画笔工具')
      this.cutNewLine()
      e.preventDefault()
      return false
    })
```



## 线段工具Line

### 实现思路：

###### 单击事件

1，判断是否处于Line工具下

2，判断是否线段的终点

> 2 =》 否，
>
> 将起始点挂载到data中
>
> 将this.createLine.isClick 改为true

> 2 =》 是，
>
> 清空this.createLine
>
> 判断直线斜率是否过大或过小，为了方便后期选择，将该直线元素的padding改为10（即将它的控制范围加大）

###### 移动事件

> 将鼠标事件的x和y 赋予newLine的x2 y2 实现预览的效果





## 曲线工具BezierCurve

### 实现思路：

###### 单击事件

1， 判断是否处于BezierCurve工具下

2， 将正在点击的flag改为true 当鼠标抬起的时候改回false

```javascript
this.createLine.isClicking = true
```

3， 判断是否为起始点，

> 3 =》 是，
>
> 将起始点挂载到data中
>
> 将this.createLine.isClick 改为true

> 3=》否
>
> 将鼠标坐标 赋予 newLine 的最后两个坐标
>
> 

###### 鼠标移动事件

1， 判断是否处于BezierCurve工具下

2， 判断已经按下尚未抬起鼠标 this.createLine.isClicking

3， 将鼠标的坐标赋予newLine的倒数第二个坐标（第二个控制点）实现预览的效果



###### 鼠标抬起事件

将正在点击的flag改为false



###### 鼠标右键事件

将预览的newLine的path去掉最后一组预览坐标

赋给新建的一个Path对象



## 抓手工具

#### 显示被抓元素信息

###### 单击事件

获取被点击元素的name 如果是直线的话还将获取其长度



#### 修改元素

###### 双击事件

取消之前抓取的元素上的浮标

创建控制浮标

直线的浮标 每个浮标的坐标为 直线的(x1, y2) (x2, y2)

曲线的浮标在path数组中，遍历获取每个坐标，生成浮标以及控制线

将浮标与被控制元素互相绑定



###### 单击事件

取消之前抓取的元素上的浮标



###### 元素移动事件

如果是直线移动，则更新直线的坐标 x1 y1 x2 y2

如果是曲线移动，则新建一根曲线代替之前的曲线

如果是浮标移动，则移动中更新被抓元素的坐标和path

移动后生成新的曲线代替（直线就不代替了）



## 删除工具

将抓取到的元素remove



## 磁吸工具

首先遍历画布中每一个元素，

###### 优先磁吸节点

获取其节点，

计算鼠标坐标与其距离 缓存之

对比上一个对象的距离 如果比它小 取代之（获得最小距离的元素和节点坐标）

如果这个最小距离小于10 则将鼠标下的圆圈坐标改为它

如果上一步以及获取到距离小于10的节点元素，则不进行下一步



###### 磁吸线段

再遍历画布每个元素，过滤出与鼠标相交的元素

如果是直线 计算点到线的距离  缓存之

对比上一个对象的距离 如果比它小 取代之（获得最小距离的元素和节点坐标）

如果这个最小距离小于10 则将鼠标下的圆圈坐标改为它

如果是曲线（尚未想好思路）

想法一： 

根据曲线公式 *B*(*t*)=(1−*t*)3*P*0+3*t*(1−*t*)2*P*1+3*t*2(1−*t*)*P*2+*t*3*P*3

已知鼠标的坐标为 （x,y)

将B(t) = y代入 求出与鼠标竖线的相交点 再计算距离

同理将B(t) = x 和B(tx) = B(ty) 和 B(tx) = -B(ty)  的所有交点，计算其中每个相交点的距离



想法二：

根据公式可以列出 曲线每个点到鼠标坐标xy的距离 len = F(t)  再反向列出t=F(len)  当len趋于最小值的时候t为



想法三：

根据曲线公式 将曲线分为若干段，计算每个分割点的坐标，计算每个坐标到鼠标的距离

