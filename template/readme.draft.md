#双手奉上这份Koa的简易手敲模板

上上一期链接——也就是本文的基础，[参考KOA，5步手写一款粗糙的web框架](https://juejin.im/post/5b7e8718e51d4538ca573445)

上一期链接——有关Router的实现思路，[参考KOA，5步手写一款粗糙的web框架](https://juejin.im/post/5b7e8718e51d4538ca573445)

本文参考仓库：[点我](https://github.com/nanaSun/myHTTP/tree/master/router)

上一期科普了Router，我们可以为每一张页面配置一个路由，但是我们不可能每个`router.get(path,(ctx,next)=>{ctx.body=...})`都直接写`html`，这样代码也太难维护了。于是出现了模版这个东西，模版主要是用来管理页面的。每一个`html`都放入一个单独的文件中，这样无论是调用还是复用都很方便。

那么，我们从最简单的静态页面开始吧～

## STEP 1 静态页面调用

调用文件不是一件难事，只需要读取，然后赋值给`ctx.body`即可：

```
let indexTPL=fs.readFileSync(path.join(__dirname,"/pages/template.ejs"),"utf-8")
ctx.body=indexTPL;
```

这里为了方便写代码，所以我用了`readFileSync`这个同步方法，而没有用异步读取的方法。