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

