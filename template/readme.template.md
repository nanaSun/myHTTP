# KOA的简易模板引擎实现方式

上上一期链接——也就是本文的基础，[参考KOA，5步手写一款粗糙的web框架](https://juejin.im/post/5b7e8718e51d4538ca573445)

上一期链接——有关Router的实现思路，[这份Koa的简易Router手敲指南请收下](https://juejin.im/post/5b7fd1bc6fb9a019b421cc35)

本文参考仓库：[点我](https://github.com/nanaSun/myHTTP/tree/master/template)

上一期科普了Router，我们可以为每一张页面配置一个路由，但是我们不可能每个`router.get(path,(ctx,next)=>{ctx.body=...})`都直接写`html`，这样代码也太难维护了。于是出现了模版这个东西，模版主要是用来管理页面的。每一个`html`都放入一个单独的文件中，这样无论是调用还是复用都很方便。

那么，我们从最简单的静态页面开始吧～

## STEP 1 静态页面调用

调用文件不是一件难事，只需要读取，然后赋值给`ctx.body`即可：

```
const fs=require("fs")
const path=require("path")
let indexTPL=fs.readFileSync(path.join(__dirname,"/pages/template.ejs"),"utf-8")
ctx.body=indexTPL;
```

这里我先以逻辑为主，所以我用了`readFileSync`这个同步方法，而没有用异步读取的方法。

## STEP 2 封装一个中间件View

这里，我们新创建一个名为View中间件，专门用于模板嵌套。
```
const fs=require("fs")
const path=require("path")
function View(path){
    let tpl="";
    return async (ctx,next)=>{
        tpl = fs.readFileSync(path.join(__dirname,path),"utf-8")
        ctx.body= tpl
        await next();
    }
}
```
然后我们就可以直接在项目中应用这个中间件了。
```
let view=require("./Views")
let router=new Router()
router.get("/",view("/pages/template.ejs"))
```
或者
```
app.use(view("/pages/template.ejs"))
```
都是可行的，因为我创建的是标准的中间件啊~

## STEP 3 提取模板标签

我们为什么要用模板！当然是为了动态页啊！所以我们需要替换模板标签`<%=参数名%>`为我们需要值。同时模板也需要支持一些函数，比如数组循环填充列表。

那么第一步，我们需要的就是将这个标签提取出来，然后替换成我们特有的标签`<!--operator 1-->`这个可以自定义一个特别的标签用于占位符。

大家没听错，提取，替换！所以`正则表达式`是躲不过了，他已经在虐我的路上了……

因为单纯的赋值和执行函数差别比较大，所以我把他们分开识别。如果大家有更好的方法，记得推荐给我。（正则渣渣瑟瑟发抖）

```
let allTags=[];
function getTags(){
    //先取出需要执行的函数，也就是不带"="的一对标签，放入数组，并且，将执行函数这一块替换成占位符。
    let operators = tpl.match(/<%(?!=)([\s\S]*?)%>([\s\S]*?)<%(?!=)([\s\S]*?)%>/ig)||[]
    operators.forEach((element,index )=> {
        tpl=tpl.replace(element,`<!--operator ${index}-->`)
    });
    //再取出含有“=”的专门的赋值标签，怕和执行函数中的赋值标签搞混，所以这边我分开执行了
    let tags=tpl.match(/<%=([\s\S]*?)%>/ig)||[]
    tags.forEach((element,index) => {
        tpl=tpl.replace(element,`<!--operator ${index+operators.length}-->`)
    });
    //给我一个整套的待替换数组
    allTags=[...operators,...tags];
}
```

## STEP 4 替换模板标签

重头戏来了，现在我们要进行模板替换了，要换成我们传入的值。这里需要注意的就是我们将`allTags`逐个替换成可执行的js文本，然后执行js，生成的字符串暂存于数组之中。等执行完毕，再将之前的`<!--operator 1-->`占位符替换掉。

这里需要注意的是，我们先把赋值的标签`<%=%>`去除，变成`${}`，就像下方这样：

```
let str="let tmpl=`<p>字符串模板:${test}</p>
<ul>
    <li>for循环</li>
    <% for(let user of users){ %>
    <li>${user}</li>
    <% } %>
</ul>`
return tmpl"
```
然后我们再把可执行的函数的<%%>去除，首尾加上```闭合字符串，就像下方这样：
```
let str="let tmpl=`<p>字符串模板:${test}</p>
<ul>
    <li>for循环</li>`
    for(let user of users){
    tmpl+=`<li>${user}</li>`
    } 
`</ul>`
return tmpl"
```

但是这是字符串啊，这个时候我们要借助一个方法[Function 构造函数 ](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function)

我们可以new一个Function，然后将字符串变成可以执行的js。

Function的语法是这样的`new Function ([arg1[, arg2[, ...argN]],] functionBody)`，再字符串之前可以声明无数个参数，那么我们就借助`...`三个帮我们把`Object`变成单个参数放进去就可以了。

举个例子：
```
let data={
    test:"admin",
    users:[1,2,3]
}
```
上方对象，我们用`Object.keys(data)`，提取字段名，然后利用三点扩展运算符`...`，变成`test,users`
```
new Function(...Object.keys(data),方法字符串)
```
也就等同于
```
new Function(test,users,方法字符串)
```
我们合并下上方的字符串，这个可执行的模板js就是这样的，怎么样是不是好理解了？
```
function xxx(test,users){
   let tmpl=`<p>字符串模板:${test}</p>
            <ul>
            <li>for循环</li>`
            for(let user of users){
            tmpl+=`<li>${user}</li>`
            } 
        `</ul>`
    return tmpl;
}
```

感觉要变成可执行的js，原理不难，就是拼合起来很复杂。

下方是完整的执行代码：

```
function render(){
    //获取标签
    getTags();
    //开始组合每个标签中的内容，然后将文本变成可执行的js
    allTags=allTags.map((e,i)=>{
        let str = `let tmpl=''\r\n`;
        str +=  'tmpl+=`\r\n';
        str += e
        //先替换赋值标签
        str = str.replace(/<%=([\s\S]*?)%>/ig,function () {
            return '${'+arguments[1]+'}'
        })
        //再替换函数方法，记得别忘了首位的"`"这个闭合标签
        str = str.replace(/<%([\s\S]*?)%>/ig,function () {
            return '`\r\n'+arguments[1] +"\r\ntmpl+=`"
        })
        str += '`\r\n return tmpl';

        //提取object的key值，用于function的参数
        let keys=Object.keys(data);
        let fnStr = new Function(...keys,str);
        return fnStr(...keys.map((k)=>data[k]));
    })
    allTags.forEach((element,index )=> {
        tpl=tpl.replace(`<!--operator ${index}-->`,element)
    });
}
```

## STEP + 如果想用异步的方式读取文件，我推荐：

将`readFile`变成一个`Promise`，然后放入中间件中`await`一下,这样就可以实现异步了~

如果不了解async/await，[科普传送门](https://juejin.im/post/5b851e136fb9a019f47d1d4b)。

```
const util=require("util")
const fs=require("fs")
const path=require("path")
let readFile=util.promisify(fs.readFile)
function view(p,data){
    let tpl="";
    let allTags=[];
    function getTags(){
        //略
    }
    function render(){
        //略
    }
    return async (ctx,next)=>{
        tpl = await readFile(path.join(__dirname,p),"utf-8")
        //别忘了运行render()，替换模板标签
        render();
        ctx.body=tpl;
        await next();
    }
}
```