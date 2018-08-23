# 参考KOA，5步手写一款粗糙的web框架

仅分析大概思路，分析KOA的原理，还有许多类似于node版本的问题，不在此文章的讨论范围内。

本文github地址：[点我](https://github.com/nanaSun/myHTTP)

## step1 封装`http.createServer`

先写一个初始版的`application`，让程序先跑起来。这里我们仅仅实现：
* 封装`http.createServer`到myhttp的类
* 将回调独立出来
* `listen`方法可以直接用

**step1/application.js**
```
let http=require("http")
class myhttp{
    handleRequest(req,res){
        console.log(req,res)
    }
    listen(...args){
        // 起一个服务
        let server = http.createServer(this.handleRequest.bind(this));
        server.listen(...args)
    }
}
```
**这边的`listen`完全和`server.listen`的用法一摸一样，就是传递了下参数**

*友情链接*

[`server.listen`的API](http://nodejs.cn/api/http.html#http_server_listen)

[ES6解构赋值`...`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)

**step1/testhttp.js**
```
let myhttp=require("./application")
let app= new myhttp()
app.listen(3000)
```
运行`testhttp.js`，结果打印出了`req`和`res`就成功了~

## step2  封装原生req和res

这里我们需要做的封装，所需只有两步：
* 读取（get）req和res的内容
* 修改（set）res的内容

**step2/request.js**
```
let request={
    get url(){
        return this.req.url
    }
}
module.exports=request
```
**step2/response.js**
```
let response={
    get body(){
        return this.res.body
    },
    set body(value){
        this.res.body=value
    }
}
module.exports=response
```
如果po上代码，就是这么简单，需要的属性可以自己加上去。那么问题来这个`this`指向哪里？？代码是很简单，但是这个指向，并不简单。

回到我们的`application.js`，让这个`this`指向我们的myhttp的实例。

**step2/application.js**

```
class myhttp{
    constructor(){
        this.request=Object.create(request)
        this.response=Object.create(response)
    }
    handleRequest(req,res){
        let request=Object.create(this.request)
        let response=Object.create(this.response)
        request.req=req
        request.request=request
        response.req=req
        response.response=response
        console.log(request.headers.host,request.req.headers.host,req.headers.host)
    }
    ...
}
```

此处，我们用`Object.create`拷贝了一个副本，然后把request和response分别挂上，我们可以通过最后的一个测试看到，我们可以直接通过`request.headers.host`访问我们需要的信息，而可以不用通过`request.req.headers.host`这么长的一个指令。这为我们下一步，将`request`和`response`挂到`context`打了基础。

## step3 `context`闪亮登场

`context`的功能，我对他没有其他要求，就可以直接`context.headers.host`，而不用`context.request.headers.host`,但是我不可能每次新增需要的属性，都去写一个get/set吧？于是`Object.defineProperty`这个神操作来了。

**step3/content.js**

```
let context = {
}
//可读可写
function access(target,property){
   Object.defineProperty(context,property,{
        get(){
            return this[target][property]
        },
        set(value){
            this[target][property]=value
        }
   })
}
//只可读
function getter(target,property){
   Object.defineProperty(context,property,{
        get(){
            return this[target][property]
        }
   })
}
getter('request','headers')
access('response','body')
...
```
这样我们就可以方便地进行定义数据了，不过需要注意地是，`Object.defineProperty`地对象只能定义一次，不能多次定义，会报错滴。

**step3/application.js**
接下来就是连接`context`和`request`和`response`了，新建一个`createContext`，将`response`和`request`颠来倒去地挂到`context`就可了。
```
class myhttp{
    constructor(){
        this.context=Object.create(context)
        ...
    }
    createContext(req,res){
        let ctx=Object.create(this.context)
        let request=Object.create(this.request)
        let response=Object.create(this.response)
        ctx.request=request
        ctx.response=response
        ctx.request.req=ctx.req=req
        ctx.response.res=ctx.res=res
        return ctx
    }
    handleRequest(req,res){
        let ctx=this.createContext(req,res)
        console.log(ctx.headers)
        ctx.body="text"
        console.log(ctx.body,res.body)
        res.end(ctx.body);
    }
    ...
}
```

以上3步终于把准备工作做好了，接下来进入正题。😭
*友情链接：*
* [Object.defineProperty](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)

## step4 实现`use`

这里我需要完成两个功能点：

* `use`可以多次调用，中间件middleWare按顺序执行。
* `use`中传入`ctx`上下文，供中间件middleWare调用

想要多个中间件执行，那么就建一个数组，将所有地方法都保存在里头，然后等到执行的地时候forEach一下，逐个执行。传入的`ctx`就在执行的时候传入即可。

**step4/application.js**
```
class myhttp{
    constructor(){
        this.middleWares=[]
        ...
    }
    use(callback){
        this.middleWares.push(callback)
        return this;
    }
    ...
    handleRequest(req,res){
        ...
        this.middleWares.forEach(m=>{
            m(ctx)
        })
        ...
    }
    ...
}
```

此处在`use`中加了一个小功能，就是让use可以实现链式调用，直接返回`this`即可，因为`this`就指代了`myhttp`的实例`app`。

**step4/testhttp.js**
```
...
app.use(ctx=>{
    console.log(1)
}).use(ctx=>{
    console.log(2)
})
app.use(ctx=>{
    console.log(3)
})
...
```

## **step5 实现中间件的异步执行**

任何程序只要加上了异步之后，感觉难度就蹭蹭蹭往上涨。

这里要分两点来处理：
* `use`中中间件的异步执行
* 中间件的异步完成后`compose`的异步执行。

*首先是`use`中的异步*
如果我需要中间件是异步的，那么我们可以利用async/await这么写，返回一个promise
```
app.use(async (ctx,next)=>{
    await next()//等待下方完成后再继续执行
    ctx.body="aaa"
})
```
如果是promise，那么我就不能按照普通的程序foreach执行了，我们需要一个完成之后在执行另一个，那么这边我们就需要将这些函数组合放入另一个方法`compose`中进行处理，然后返回一个promise，最后来一个`then`，告诉程序我执行完了。
```
handleRequest(req,res){
    ....
    this.compose(ctx,this.middleWares).then(()=>{
        res.end(ctx.body)
    }).catch(err=>{
        console.log(err)
    })
    
}
```
那么compose怎么写呢？

首先这个middlewares需要一个执行完之后再进行下一个的执行，也就是回调。其次compose需要返回一个promise，为了告诉最后我执行完毕了。

第一版本compose，简易的回调，像这样。不过这个和`foreach`并无差别。这里的`fn`就是我们的中间件，`()=>dispatch(index+1)`就是`next`。
```
compose(ctx,middlewares){
    function dispatch(index){
        console.log(index)
        if(index===middlewares.length) return;
        let fn=middlewares[index]
        fn(ctx,()=>dispatch(index+1));
    }
    dispatch(0)
}
```
第二版本compose，我们加上async/await，并返回promise，像这样。不过这个和`foreach`并无差别。`dispatch`一定要返回一个promise。

```
compose(ctx,middlewares){
    async function dispatch(index){
        console.log(index)
        if(index===middlewares.length) return;
        let fn=middlewares[index]
        return await fn(ctx,()=>dispatch(index+1));
    }
    return dispatch(0)
}
```
`return await fn(ctx,()=>dispatch(index+1));`注意此处，这就是为什么我们需要在`next`前面加上await才能生效？作为promise的`fn`已经执行完毕了，如果不等待后方的promise，那么就直接`then`了，后方的`next`就自身自灭了。所以如果是异步的，我们就需要加上`async/await`以保证`next`执行完之后再返回上一个`promise`。不懂？我们看几个例子。

具体操作如下：
```
function makeAPromise(ctx){
    return new Promise((rs,rj)=>{
        setTimeout(()=>{
            ctx.body="bbb"
            rs()
        },1000)
    })
}
//如果下方有需要执行的异步操作
app.use(async (ctx,next)=>{
    await next()//等待下方完成后再继续执行
    ctx.body="aaa"
})
app.use(async (ctx,next)=>{
    await makeAPromise(ctx).then(()=>{next()})
})
```

上述代码先执行`ctx.body="bbb"`再执行`ctx.body="aaa"`，因此打印出来是`aaa`。如果我们反一反：

```
app.use(async (ctx,next)=>{
    ctx.body="aaa"
    await next()//等待下方代码完成
})
```

那么上述代码就先执行`ctx.body="aaa"`再执行`ctx.body="bb"`，因此打印出来是`bbb`。
这个时候我们会想，既然我这个中间件不是异步的，那么是不是就可以不用加上async/await了呢？实践出真理：
```
app.use((ctx,next)=>{
    ctx.body="aaa"
    next()//不等了
})
```

那么程序就不会等后面的异步结束就先结束了。因此如果有异步的需求，尤其是需要靠异步执行再进行下一步的的操作，就算本中间件没有异步需求，也要加上async/await。


*终于写完了，感觉脑细胞死了不少，接下来我去研究router和ejs，等这一块加入我的web框架之后，就很完美了~*