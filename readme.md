# 参考KOA，手写一款你自己的web框架

## 搞定context

先修知识点：
* get()
* set()
* [Object.defineProperty](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)

context主要是用于给中间件操作的一个对象，因此它需要包含req和res，它里面主要的一些属性：
* req：node原生对象
* res：node原生对象
* request：自行封装后的req
* response：自行封装后的res

## application 

用于中间件的处理，这里我们需要注意两点：

* 多个中间件的执行
* 异步中间件的处理

### 多个中间件的执行

我们一般通过`app.use`来执行middleware，但是不可能只use一次，因此这边我们可以将use里面的function放入一个数组中

```
//index.js
app.use(callback1)
app.use(callback2)

//application.js
class myhttp{
    .....
    use(callback){
        this.middleware.push(callback);
    }
    .....
}
```

然后怎么执行这一串数组呢？我么可以采取回调的方式：
```
class myhttp{
    .....
    compose(ctx,middlewares){
        function dispatch(index){
            //函数数组都完成了，就返回，不再继续执行了
            if(index===middlewares.length) return;
            let callback=middlewares[index]
            //当前执行结束了进入下一个函数
            callback(ctx,()=>dispatch(index+1));
        }
        dispatch(0)
    }
    handleRequest(req,res){
        .....
        // 处理函数数组
        this.compose(ctx,this.middlewares)
        .....
    }
    .....
}
```
### 异步中间件的处理

这里要分两点来处理，一个是`use`的异步执行，还有一个是等所有的异步完成后`compose`的异步执行。

#### `use`中的异步

这里我们用async和await来写异步。


我希望所有的middleware都执行完毕之后再进行下一步的操作，就像这个样子：
```
this.compose(ctx,this.middlewares).then(()=>{
    res.end(ctx.body)
}).catch(err=>{
    this.emit('error',err)
})
```
也就是说`application`里面compose也需要变成一个promise，那么我们就给他加上一个promise
```
compose(ctx,middlewares){
    //把dispatch变成一个promise
    async function dispatch(index){
        console.log(index)
        if(index===middlewares.length) return;
        let fn=middlewares[index]
        //await等待下一个异步执行完毕，也就是说fn也需要返回一个promise
        await fn(ctx,()=>dispatch(index+1));
    }
    return dispatch(0)
}
```
我们发现仅仅在application中处理是无效的，因为有个回调函数呢，这个回调函数需要返回一个promise，因此我们在写`use`的时候也需要注意
```
//保证返回的中间件是一个promise
app.use(async (ctx,next)=>{
    ctx.body="aaa"
    console.log(ctx.response.body)
    await next()
})
app.use(async (ctx,next)=>{
    //await申明等待这个异步完成后再执行其他的
    await new Promise((resolve,reject)=>{
        setTimeout(()=>{
            ctx.body="bbb"
            resolve();
        },3000)
    })
    next()
})
```

## ejs模板，写一个自己的模板views方法


## router
use也可以处理路径，但是全部塞在use中太过拥挤，于是router出现了！就是把处理路径这一段独立出来了。

大家对于路由应该不陌生，就是匹配路径给出相应的页面，koa-router的基本用法是这个样子的：

```
router.get(path,(ctx,next){
    ctx.body='xxx'
    next
})
```
大家有没有觉得很眼熟？和`app.use`几乎一模一样，就是多了一个路径。不过这边每`get`一个路由，就是多了一个匹配路径，根据用户的主动请求返回相应的内容。

但是这样一行一行写感觉也容易乱啊，能不能来个分组？

这个时候我们可以用`route.use`，啊哈哈哈，语法是这样地

```
mainRouter=new Router();
mainRouter.use(prefix,routes)
app.use(mainRouter.routes)
```

emmmm，其实router.use就是一个大集合，把分组的path都集合在了一起，然后挂载到app上，毕竟app只能挂在一个route。





