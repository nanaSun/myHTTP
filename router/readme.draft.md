# 这份Koa的简易Router手敲指南请收下

本文参考仓库：[点我](https://github.com/nanaSun/myHTTP/tree/master/router)

Router其实就是路径匹配，通过匹配路径，返回给用户相应的网站内容。

以下方例子为例，主要通过提取`req`中的`path`信息，来匹配当前路径，并给`ctx.body`赋值，返回相应的界面。这个过程不复杂，就是一个匹配路径的过程。但是这种会不会太臃肿了呢，而且很有可能路径一多，就要被`if...else...`给弄晕了。
```
app.use((ctx,next)=>{
   //简易路由
   let {path}=ctx
   if(path==="/"){
       ctx.body="index"
   }else if(path==="/admin"){
        ctx.body="admin"
   }else if(path==="/user"){
        ctx.body="user"
   }
})
```
这个时候专门处理路径的插件就出现了，写一个`Router`，专门用来管理路径。

**Router的功能一共是两个：**

* 匹配路径
* 返回相应页面

**如果Router要挂载到app上，那么语法是这样的`app.use(router.routes())`，也就是说：**

* Router本身就是个中间件
* 为了返回匹配的路由，写一个中间件挂到`app`上

了解了Router的大概，我们开始一步步动手写Router吧！

## STEP1 创建Router

先把Router的框架写好，一个构造器，一个`get`方法用于配置路由，一个`routers`变成路由匹配的中间件挂在到app上。

```
class Router{
    constructor(){}
    get(path,callback){}
    routers(){}
}
```

我们获取路由的时候，一定会配置页面，那么这个页面的类也要加上了，每次`get`的时候，就加入一个页面到数组中。

```
class Page{
    constructor(path,callback){
        this.path=path
        this.callback=callback
    }
}
class Router{
    constructor(){
        this.pages=[]
    }
    get(path,callback){
        this.pages.push(new Page(path,callback))
    }
    routers(){}
}
```

因为路由是对中间件的封装，所以用法上是和`app.use`类似的：
```
router.get(path,(ctx,next){
    ctx.body='xxx'
    next()
})
```
是不是很眼熟？这个get中的`callback`参数就是中间件。


## STEP2 写一个中间件，返回匹配路由的中间件

`routers`就干三件事：

* 筛选出匹配的路由，`array.filter`就可以做到
* 组合执行这些路由
* 返回一个中间件

```
compose(ctx,next,routers){
    function dispatch(index){
        if(index===routers.length) return next();
        let router=routers[index]
        router(ctx,()=>dispatch(index+1));
    }
    dispatch(0)
}
routers(){
    let dispatch = (ctx,next)=>{
        let path=ctx.path    
        let routers=this.pages.filter(p=>{console.log(p.path);return p.path===path}).map(p=>p.callback)
        this.compose(ctx,next,routers)
    }
    return dispatch
}
```

大家有没有很眼熟，和koa中的application.js的回调很像。其实就是一个回调的过程，然后让我我们在使用上增加了很大的便利。

## STEP3 给路由分个组吧

我们再写路由的时候，如果全部写全路径，感觉会很啰嗦：

```
router.get("/admin",(ctx,next)=>{})
router.get("/admin/login",(ctx,next)=>{})
router.get("/admin/register",(ctx,next)=>{})
...
router.get("/user",(ctx,next)=>{})
router.get("/user/login",(ctx,next)=>{})
router.get("/user/register",(ctx,next)=>{})
....
```
我们给路由分组，其实思路很简单，就是给每个小路由新建一个Router，然后大路由用`use`方法，将这些路由集合到一起。
```
let admin=new Router()
admin.get("/",(ctx,next)=>{
    ctx.body="admin"
    next()
})
let user=new Router()
user.get("/",(ctx,next)=>{
    ctx.body="user"
    next()
})
//链式调用~
let router=new Router()
router.use("/admin",admin.routers())
.use("/user",user.routers())

app.use(router.routers())
```
那么问题来了，`use`要怎么写呢才能组合这些routers？？我们先来分析下`use`的功能：
* 组合路径
* 将route加入当前对象的数组中

`use`中有两个参数一个`path`，一个`router.routers()`的中间件，可是我们需要router数组对象，所以我们可以这么做:
```
routers(){
    let dispatch = (ctx,next)=>{
      .....
    }
    dispatch.router=this
    return dispatch
}
```

*在中间件上暗搓搓地加一个router的对象，将自己一起传递出去，有么有很机智*

有了`router`的数组对象，那么`use`这个方法就很好实现了，将`page`循环一波，加入当前对象的`page`，就好了。这里再将自己返回，然后就可以愉快地使用链式调用了。

```
 use(path,middleware) {
    let router = this;
    middleware.router.pages.forEach(p => {
        router.get(path+p.path,p.callback)
    });
    return router
}
```

## step4 LAST BUT NOT LEAST

大家需要注意，还记得上一期讲的async/await异步吗？如果有任何除了路由地操作都要放在路由上方执行，因为路由只是匹配路径，返回结果，并没有async/await地操作，所以一定注意:

这样是有效地，页面返回aaa
```
app.use(async (ctx,next)=>{
    await makeAPromise(ctx).then(()=>{next()})
})
...
app.use(router.routers())
```
这样是无效的，页面不会返回aaa
```
...
app.use(router.routers())
app.use(async(ctx,next)=>{
    await next()//等待下方完成后再继续执行
    ctx.body="aaa"
})
```